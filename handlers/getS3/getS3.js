const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

exports.handler = async (event) => {
    const s3Path = event.queryStringParameters?.s3Path;

    const match = s3Path.match(/^s3:\/\/([^/]+)\/(.+)$/);
    
    const bucketName = match[1];
    const key = match[2];
    console.log("Bucket extraído:", bucketName);
    console.log("Key extraído:", key);

    const client = new S3Client({ region: "us-east-1" });

    try {
        const signedUrl = await getSignedUrl(client, new GetObjectCommand({ Bucket: bucketName, Key: key }), { expiresIn: 300 });
        console.log("URL prefirmada generada:", signedUrl); // Log para confirmar la URL generada
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
              },
            body: JSON.stringify({ url: signedUrl }),
        };
    } catch (error) {
        console.error('Error generando la URL prefirmada:', error);
        return {
            statusCode: 500,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
              },
            body: JSON.stringify({ error: 'Error generando la URL prefirmada' }),
        };
    }
};
