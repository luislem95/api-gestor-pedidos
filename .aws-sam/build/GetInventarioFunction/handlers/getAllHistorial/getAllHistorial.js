const ddb = require("./utils/db"); // Configuración de DynamoDB
const { QueryCommand } = require("@aws-sdk/lib-dynamodb");

exports.handler = async (event) => {
  try {
    // Extraer el código de usuario desde el evento
    const codigoUsuario = event.queryStringParameters?.codigoUsuario;
    if (!codigoUsuario) {
      throw new Error("El código de usuario no fue proporcionado.");
    }
    const params = {
      TableName: "general-storage",
      IndexName: "user_id-tipo-index", // Nombre del índice secundario configurado en DynamoDB
      KeyConditionExpression: "#user_id = :userIdValue AND #tipo = :tipoValue", // Clave de partición e índice de ordenamiento
      ExpressionAttributeNames: {
        "#user_id": "user_id", // Clave de partición en el índice
        "#tipo": "tipo", // Clave de ordenamiento en el índice
      },
      ExpressionAttributeValues: {
        ":userIdValue": `claro-store-pedido|${codigoUsuario}`, // Valor del user_id
        ":tipoValue": "claro-store-pedido", // Valor del tipo
      },
    };

    console.log("Parámetros de la consulta:", JSON.stringify(params));

    const data = await ddb.send(new QueryCommand(params));

    console.log("Datos devueltos por DynamoDB:", JSON.stringify(data.Items));
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*", // Permitir solicitudes desde cualquier origen
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
      body: JSON.stringify({ message: "Pedidos obtenidos con éxito", data: data.Items }),
    };
  } catch (error) {
    console.error("Error al obtener los pedidos:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*", // Permitir solicitudes desde cualquier origen
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
      body: JSON.stringify({ error: "Error al obtener los pedidos.", details: error.message }),
    };
  }
};
