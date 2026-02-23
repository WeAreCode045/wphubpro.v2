const sdk = require("node-appwrite");

module.exports = async function (req, res) {
  const client = new sdk.Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new sdk.Databases(client);
  const DATABASE_ID = "platform_db";

  try {
    const { stripeProductId } = JSON.parse(req.body);

    if (!stripeProductId) {
      return res.json(
        { success: false, message: "stripeProductId is required" },
        400
      );
    }

    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

    // Fetch Stripe product
    const product = await stripe.products.retrieve(stripeProductId);

    if (!product) {
      return res.json(
        { success: false, message: "Stripe product not found" },
        404
      );
    }

    // Extract metadata
    const label = product.metadata?.label || product.name;
    const sitesLimit = product.metadata?.sites_limit
      ? parseInt(product.metadata.sites_limit, 10)
      : 5;
    const libraryLimit = product.metadata?.library_limit
      ? parseInt(product.metadata.library_limit, 10)
      : 100;
    const storageLimit = product.metadata?.storage_limit
      ? parseInt(product.metadata.storage_limit, 10)
      : 10;

    // Prepare the local plan document
    const localPlanData = {
      name: product.name,
      description: product.description || "",
      label: label,
      sites_limit: sitesLimit,
      library_limit: libraryLimit,
      storage_limit: storageLimit,
      stripe_product_id: product.id,
      source: "stripe",
      prices: [],
    };

    // Check if this plan already exists in local_plans (by stripe_product_id)
    let existingPlan = null;
    try {
      const response = await databases.listDocuments(DATABASE_ID, "local_plans", [
        sdk.Query.equal("stripe_product_id", product.id),
      ]);
      if (response.documents.length > 0) {
        existingPlan = response.documents[0];
      }
    } catch (err) {
      // Query might fail if no docs exist, continue
    }

    let result;
    if (existingPlan) {
      // Update existing document
      result = await databases.updateDocument(
        DATABASE_ID,
        "local_plans",
        existingPlan.$id,
        localPlanData
      );
    } else {
      // Create new document with custom ID based on stripe product ID
      result = await databases.createDocument(
        DATABASE_ID,
        "local_plans",
        `stripe_${product.id}`,
        localPlanData
      );
    }

    return res.json(
      {
        success: true,
        message: existingPlan ? "Plan updated" : "Plan created",
        planId: result.$id,
        plan: result,
      },
      200
    );
  } catch (error) {
    console.error("Error pulling Stripe plan:", error);
    return res.json(
      {
        success: false,
        message: error.message || "Failed to pull Stripe plan",
        error: error.message,
      },
      500
    );
  }
};
