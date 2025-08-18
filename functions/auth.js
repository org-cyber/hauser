const ImageKit = require("imagekit");

exports.handler = async function (event, context) {
  try {
    const imagekit = new ImageKit({
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
    });

    const authParams = imagekit.getAuthenticationParameters();

    return {
      statusCode: 200,
      body: JSON.stringify(authParams),
    };
  } catch (error) {
    console.error("Auth function error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to generate auth" }),
    };
  }
};
