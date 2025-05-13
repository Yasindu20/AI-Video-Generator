export class Replicate {
  private token: string;
  private baseUrl = "https://api.replicate.com/v1";

  constructor(token: string) {
    this.token = token;
  }

  async run(model: string, input: any) {
    // Start the prediction
    const startResponse = await fetch(`${this.baseUrl}/predictions`, {
      method: "POST",
      headers: {
        Authorization: `Token ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: model,
        input: input.input,
      }),
    });

    if (!startResponse.ok) {
      throw new Error(`Failed to start prediction: ${await startResponse.text()}`);
    }

    const startData = await startResponse.json();
    const predictionId = startData.id;

    // Poll for completion
    let status = startData.status;
    let output = null;
    
    while (status !== "succeeded" && status !== "failed") {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second

      const pollResponse = await fetch(
        `${this.baseUrl}/predictions/${predictionId}`,
        {
          headers: {
            Authorization: `Token ${this.token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!pollResponse.ok) {
        throw new Error(
          `Failed to poll prediction: ${await pollResponse.text()}`
        );
      }

      const pollData = await pollResponse.json();
      status = pollData.status;
      
      if (status === "succeeded") {
        output = pollData.output;
      } else if (status === "failed") {
        throw new Error(`Prediction failed: ${pollData.error}`);
      }
    }

    return output;
  }
}