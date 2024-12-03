const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: "us-east-1" });
const dynamoDb = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  console.log("Evento recibido en Lambda:", event);

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: null,
    };
  }

  if (!event.body) {
    console.error("El cuerpo de la solicitud está vacío.");
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "El cuerpo de la solicitud no puede estar vacío." }),
    };
  }

  let requestBody;
  try {
    requestBody = JSON.parse(event.body);
    console.log("Payload recibido en Lambda:", requestBody);
  } catch (error) {
    console.error("Error al parsear el body:", error);
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "El cuerpo de la solicitud no es un JSON válido." }),
    };
  }

  const {
    tipo,
    id,
    comprobante,
    duiEmpleado,
    duiEmpresa,
    empleadoName,
    estatus,
    fecha = new Date().toISOString(),
    items = [],
    numeroPedido,
    total = "0",
    user_id,
  } = requestBody;

  const TableName = "general-storage";

  try {
    if (numeroPedido === "nuevo") {
        const params = {
          TableName,
          Item: {
            tipo,
            id,
            comprobante,
            duiEmpleado,
            duiEmpresa,
            empleadoName,
            estatus,
            fecha,
            items,
            numeroPedido: id, // Usa el ID como numeroPedido para nuevos pedidos
            total,
            user_id,
          },
          ConditionExpression: "attribute_not_exists(tipo) AND attribute_not_exists(id)",
        };
      await dynamoDb.send(new PutCommand(params));

      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "Pedido creado con éxito", pedidoId: id }),
      };
    } else {
      // Actualizar pedido existente
      const params = {
        TableName,
        Key: { tipo, id: numeroPedido }, // Usa numeroPedido como el ID del pedido existente
        UpdateExpression: `
          SET comprobante = :comprobante,
              duiEmpleado = :duiEmpleado,
              duiEmpresa = :duiEmpresa,
              empleadoName = :empleadoName,
              estatus = :estatus,
              fecha = :fecha,
              #total = :total,
              user_id = :user_id,
              #items = list_append(if_not_exists(#items, :empty_list), :new_items)
        `,
        ExpressionAttributeNames: {
          "#total": "total",
          "#items": "items",
        },
        ExpressionAttributeValues: {
          ":comprobante": comprobante,
          ":duiEmpleado": duiEmpleado,
          ":duiEmpresa": duiEmpresa,
          ":empleadoName": empleadoName,
          ":estatus": estatus,
          ":fecha": fecha,
          ":total": total,
          ":user_id": user_id,
          ":new_items": items,
          ":empty_list": [],
        },
        ReturnValues: "UPDATED_NEW",
      };

      const result = await dynamoDb.send(new UpdateCommand(params));

      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          message: "Pedido actualizado con éxito",
          updatedAttributes: result.Attributes,
        }),
      };
    }
  } catch (error) {
    console.error("Error al procesar la solicitud:", error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Error al procesar la solicitud", error }),
    };
  }
};
