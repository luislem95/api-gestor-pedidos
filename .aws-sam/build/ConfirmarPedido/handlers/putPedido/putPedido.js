const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, UpdateCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: "us-east-1" });
const dynamoDb = DynamoDBDocumentClient.from(client);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "OPTIONS, POST",
  "Access-Control-Allow-Headers": "Content-Type",
};

exports.handler = async (event) => {
  console.log("Evento recibido en Lambda:", event);

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: null };
  }

  if (!event.body) {
    console.error("El cuerpo de la solicitud está vacío.");
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ message: "El cuerpo de la solicitud no puede estar vacío." }),
    };
  }

  let requestBody;
  try {
    requestBody = JSON.parse(event.body);
  } catch (error) {
    console.error("Error al parsear el body:", error);
    return {
      statusCode: 400,
      headers: corsHeaders,
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
    total,
    user_id,
  } = requestBody;

  const TableName = "general-storage";

  // Calcular total
  const calculatedTotal = items.reduce(
    (sum, item) => sum + (parseFloat(item.cantidad) * parseFloat(item.precio) || 0),
    0
  );

  try {
    let newNumeroPedido = numeroPedido;

    if (numeroPedido === "nuevo") {
      const scanParams = {
        TableName,
        ProjectionExpression: "numeroPedido",
        FilterExpression: "attribute_exists(numeroPedido)",
      };

      const scanResult = await dynamoDb.send(new ScanCommand(scanParams));
      const numerosPedidos = scanResult.Items.map((item) => parseInt(item.numeroPedido, 10)).filter((num) => !isNaN(num));

      newNumeroPedido = numerosPedidos.length > 0 ? Math.max(...numerosPedidos) + 1 : 10000;

      console.log("Nuevo número de pedido generado:", newNumeroPedido);

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
          numeroPedido: newNumeroPedido.toString(),
          total: calculatedTotal.toFixed(2),
          user_id,
        },
        ConditionExpression: "attribute_not_exists(tipo) AND attribute_not_exists(id)",
      };

      await dynamoDb.send(new PutCommand(params));

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ message: "Pedido creado con éxito", pedidoId: id, numeroPedido: newNumeroPedido }),
      };
    } else {
      const params = {
        TableName,
        Key: { tipo, id: numeroPedido },
        UpdateExpression: `SET comprobante = :comprobante,
              duiEmpleado = :duiEmpleado,
              duiEmpresa = :duiEmpresa,
              empleadoName = :empleadoName,
              estatus = :estatus,
              fecha = :fecha,
              #total = :total,
              user_id = :user_id,
              #items = list_append(if_not_exists(#items, :empty_list), :new_items)`,
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
          ":total": calculatedTotal.toFixed(2),
          ":user_id": user_id,
          ":new_items": items,
          ":empty_list": [],
        },
        ReturnValues: "UPDATED_NEW",
      };

      const result = await dynamoDb.send(new UpdateCommand(params));

      return {
        statusCode: 200,
        headers: corsHeaders,
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
      headers: corsHeaders,
      body: JSON.stringify({ message: "Error al procesar la solicitud", error: error.message }),
    };
  }
};
