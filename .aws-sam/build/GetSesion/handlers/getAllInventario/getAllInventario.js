const ddb = require("../../utils/db"); // Configuración de DynamoDB
const { QueryCommand } = require("@aws-sdk/lib-dynamodb");

exports.handler = async (event) => {
  try {
    const params = {
      TableName: "general-storage",
      KeyConditionExpression: "#tipo = :tipoValue", // Clave de partición
      ExpressionAttributeNames: {
        "#tipo": "tipo", // Clave de partición
      },
      ExpressionAttributeValues: {
        ":tipoValue": "claro-store-inventario", // Valor fijo de tipo
      },
      ProjectionExpression: "cantidad, electronico, id, imagen, nombre, precio, tipo", // Las columnas deseadas
    };

    console.log("Params enviados:", JSON.stringify(params));

    const data = await ddb.send(new QueryCommand(params));

    console.log("Respuesta de DynamoDB:", JSON.stringify(data));

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      },
      body: JSON.stringify({
        message: "Inventario obtenido con éxito",
        data: data.Items, // Array con los elementos encontrados
      }),
    };
  } catch (error) {
    console.error("Error al obtener el inventario:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      },
      body: JSON.stringify({ error: "Error al obtener el inventario" }),
    };
  }
};
