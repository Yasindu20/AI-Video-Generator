import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Replicate } from "@/lib/replicate";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    const userId = session.user.id as string;
    const body = await req.json();
    const { prompt } = body;
    
    if (!prompt) {
      return new NextResponse("Prompt is required", { status: 400 });
    }
    
    // Check if user has credits
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
    
    if (!user || user.credits <= 0) {
      return new NextResponse("Not enough credits", { status: 403 });
    }
    
    // Create a pending video
    const video = await prisma.video.create({
      data: {
        userId,
        prompt,
        status: "PENDING",
      },
    });
    
    // Start the video generation process asynchronously
    // This is simplified for the MVP; in a production app, you'd use a queue
    const replicate = new Replicate(process.env.REPLICATE_API_TOKEN!);
    
    // Update video status to PROCESSING
    await prisma.video.update({
      where: {
        id: video.id,
      },
      data: {
        status: "PROCESSING",
      },
    });
    
    // Generate the video
    try {
      const output = await replicate.run(
        "stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438",
        {
          input: {
            prompt: prompt,
            video_length: "14_frames_with_svd",
            sizing_strategy: "maintain_aspect_ratio",
            motion_bucket_id: 127,
            frames_per_second: 6,
          },
        }
      );
      
      // Update the video with the URL
      await prisma.video.update({
        where: {
          id: video.id,
        },
        data: {
          status: "COMPLETED",
          videoUrl: output.video, // Assuming the API returns a video URL
          thumbnailUrl: output.frames?.[0] || output.video, // Use first frame as thumbnail
        },
      });
      
      // Deduct credit from the user
      await prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          credits: {
            decrement: 1,
          },
        },
      });
      
    } catch (error) {
      console.error("[VIDEO_GENERATION_ERROR]", error);
      await prisma.video.update({
        where: {
          id: video.id,
        },
        data: {
          status: "FAILED",
        },
      });
      return new NextResponse("Video generation failed", { status: 500 });
    }
    
    return NextResponse.json({ videoId: video.id });
  } catch (error) {
    console.error("[VIDEO_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    const userId = session.user.id as string;
    const url = new URL(req.url);
    const videoId = url.searchParams.get("id");
    
    if (videoId) {
      const video = await prisma.video.findUnique({
        where: {
          id: videoId,
          userId,
        },
      });
      
      if (!video) {
        return new NextResponse("Video not found", { status: 404 });
      }
      
      return NextResponse.json(video);
    }
    
    const videos = await prisma.video.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    
    return NextResponse.json(videos);
  } catch (error) {
    console.error("[VIDEO_GET_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}