const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const ddb = require("./utils/db");

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") {
    console.log("Solicitud preflight OPTIONS recibida.");
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "Preflight OPTIONS request handled." }),
    };
  }

  try {
    console.log("Evento recibido:", JSON.stringify(event, null, 2));

    if (!event.body) {
      throw new Error("El cuerpo de la solicitud está vacío");
    }

    const body = JSON.parse(event.body);
    const { id, tipo } = body;

    if (!id || !tipo) {
      throw new Error("Los campos 'id' y 'tipo' son obligatorios");
    }

    // Actualizar el estado del pedido a 'Cancelado'
    const updateParams = {
      TableName: "general-storage",
      Key: {
        tipo: tipo,
        id: id,
      },
      UpdateExpression: "SET estatus = :estatus",
      ExpressionAttributeValues: {
        ":estatus": "Cancelado",
      },
      ReturnValues: "ALL_NEW",
    };

    const result = await ddb.send(new UpdateCommand(updateParams));
    console.log("Pedido actualizado:", result.Attributes);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: "Pedido cancelado exitosamente",
        data: result.Attributes,
      }),
    };
  } catch (error) {
    console.error("Error al procesar la solicitud:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: "Error al cancelar el pedido",
        error: error.message,
      }),
    };
  }
};