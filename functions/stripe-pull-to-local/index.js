const { Client, Databases, Query } = require("node-appwrite");

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;

async function pullStripeToLocal(stripeProductId, stripeName, stripeDescription) {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  // Check if plan already pulled from this product
  const existingDocs = await databases.listDocuments(DATABASE_ID, "local_plans", [
    Query.equal("stripe_product_id", stripeProductId),
  ]);

  if (existingDocs.total > 0) {
    throw new Error("This Stripe plan has already been pulled to local plans.");
  }

  // Create document ID from stripe product ID
  const docId = `stripe_${stripeProductId}`;

  // Prepare document data
  const docData = {
    name: stripeName,
    description: stripeDescription || "",
    label: stripeName.toLowerCase().replace(/\s+/g, "_"),
    sites_limit: null,
    library_limit: null,
    storage_limit: null,
    stripe_product_id: stripeProductId,
    source: "stripe",
    prices: [],
  };

  try {
    const createdDoc = await databases.createDocument(
      DATABASE_ID,
      "local_plans",
      docId,
      docData,
    );

    return {
      success: true,
      message: "Plan pulled to local successfully",
      documentId: createdDoc.$id,
      document: createdDoc,
    };
  } catch (error) {
    console.error("Error creating local plan:", error);
    throw new Error(`Failed to create local plan: ${error.message}`);
  }
}

export default async (req, res) => {
  try {
    const { stripeProductId, stripeName, stripeDescription } = JSON.parse(
      req.payload,
    ) || {};

    if (!stripeProductId || !stripeName) {
      return res.json(
        {
          success: false,
          message: "stripeProductId and stripeName are required",
        },
        400,
      );
    }

    const result = await pullStripeToLocal(
      stripeProductId,
      stripeName,
      stripeDescription,
    );
    return res.json(result);
  } catch (error) {
    console.error("Function error:", error);
    return res.json(
      {
        success: false,
        message: error.message || "Failed to pull plan to local",
      },
      500,
    );
  }
};
