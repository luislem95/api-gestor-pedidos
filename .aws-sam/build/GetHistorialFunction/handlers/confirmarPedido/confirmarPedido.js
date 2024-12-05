const { DynamoDBClient, UpdateItemCommand } = require("@aws-sdk/client-dynamodb");

const dynamoDB = new DynamoDBClient({ region: "us-east-1" });

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Manejar preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
    };
  }

  try {
    const body = JSON.parse(event.body);

    const { tipo, id, total } = body;

    // Validar los parámetros necesarios
    if (!tipo || !id || total === undefined) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          message: "Todos los campos son requeridos: tipo, id, total.",
        }),
      };
    }

    // Validar que el total sea un número
    if (isNaN(total)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          message: "El total debe ser un número válido.",
        }),
      };
    }

    // Parámetros para actualizar DynamoDB
    const params = {
      TableName: "general-storage", // Asegúrate de que este nombre coincida exactamente con tu tabla
      Key: {
        tipo: { S: tipo }, // Clave de partición (Partition Key)
        id: { S: id }, // Clave de ordenación (Sort Key)
      },
      UpdateExpression: "SET estatus = :estatus, #totalAlias = :total",
      ExpressionAttributeNames: {
        "#totalAlias": "total", // Alias para el atributo reservado
      },
      ExpressionAttributeValues: {
        ":estatus": { S: "Pedido" }, // Establece el estatus como "Pedido"
        ":total": { N: total.toString() }, // Actualización del atributo total
      },
      ReturnValues: "UPDATED_NEW", // Devuelve los atributos actualizados
    };

    // Enviar el comando de actualización
    const result = await dynamoDB.send(new UpdateItemCommand(params));

    console.log("Datos actualizados con éxito:", result.Attributes);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: "Datos actualizados con éxito",
        updatedAttributes: result.Attributes,
      }),
    };
  } catch (error) {
    console.error("Error al confirmar el pedido:", {
      message: error.message,
      stack: error.stack,
    });

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: "Error al actualizar los datos",
        error: error.message,
      }),
    };
  }
};
