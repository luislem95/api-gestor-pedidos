const { v4: uuidv4 } = require("uuid");
const { QueryCommand, PutCommand, UpdateCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
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
    const { id, tipo, estatus } = body; // Nota: 'total' ya no se recibe desde el frontend.

    if (!id || !tipo) {
      throw new Error("Los campos 'id' y 'tipo' son obligatorios");
    }

    const tipoDestino = "claro-store-pedido";

    // Buscar datos de la sesión
    const queryParams = {
      TableName: "general-storage",
      KeyConditionExpression: "tipo = :tipo AND id = :id",
      ExpressionAttributeValues: {
        ":tipo": tipo,
        ":id": id,
      },
    };

    const sessionData = (await ddb.send(new QueryCommand(queryParams))).Items?.[0];
    if (!sessionData) {
      throw new Error("No se encontraron datos para el ID proporcionado.");
    }
    console.log("Datos obtenidos de la sesión:", sessionData);

    // Calcular el total general
    const items = sessionData.carrito || [];
    const total = items.reduce((sum, item) => {
      const itemTotal = (item.cantidad || 0) * (item.precio || 0);
      return sum + itemTotal;
    }, 0);

    console.log("Total calculado:", total);

    // Actualizar contador y obtener el nuevo valor
    const updateParams = {
      TableName: "general-storage",
      Key: {
        tipo: "claro-store-contador-pedido",
        id: "contador",
      },
      UpdateExpression: "ADD numeroPedido :incremento",
      ExpressionAttributeValues: {
        ":incremento": 1,
      },
      ReturnValues: "UPDATED_NEW",
    };
    
    const contadorResult = await ddb.send(new UpdateCommand(updateParams));
    
    // Verificar si el contador fue actualizado y obtener su valor
    const numeroPedido = contadorResult.Attributes?.numeroPedido || 0;
    console.log("Número de pedido actualizado:", numeroPedido);

    // Crear nuevo pedido
    const nuevoId = uuidv4().replace(/-/g, "");
    const fechaActual = new Date();
  
    // Restar 6 horas
    fechaActual.setHours(fechaActual.getHours() - 6);
  
    // Convertir la fecha a formato ISO (puedes ajustar el formato si es necesario)
    const fechaUTCAdjustada = fechaActual.toISOString();

    const nuevoPedido = {
      tipo: tipoDestino,
      id: nuevoId,
      numeroPedido,
      duiEmpleado: id,
      items,
      total,
      estatus: estatus || "Nuevo",
      fecha: fechaUTCAdjustada,
      duiEmpresa: sessionData.duiEmpresa,
      empleadoName: sessionData.empleadoName,
      user_id: `claro-store-pedido|${sessionData.duiEmpresa}`,
      datosAdicionales: {
        empresa: sessionData.empresaName || "Empresa desconocida",
        sucursal: "Sucursal Central",
        nota: "Pedido confirmado automáticamente",
      },
    };

    console.log("Nuevo pedido generado:", nuevoPedido);

    // Insertar nuevo pedido en DynamoDB
    const putParams = {
      TableName: "general-storage",
      Item: nuevoPedido,
    };

    await ddb.send(new PutCommand(putParams));

    // Eliminar la sesión
    const deleteParams = {
      TableName: "general-storage",
      Key: {
        tipo: tipo,
        id: id,
      },
    };

    await ddb.send(new DeleteCommand(deleteParams));

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: "Pedido confirmado y sesión eliminada exitosamente",
        data: nuevoPedido,
      }),
    };
  } catch (error) {
    console.error("Error al procesar la solicitud:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: "Error al confirmar el pedido",
        error: error.message,
      }),
    };
  }
};
