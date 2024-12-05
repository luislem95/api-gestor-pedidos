const ddb = require("../../utils/db"); // Configuración de DynamoDB
const { QueryCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

exports.handler = async (event) => {
  try {
    const idUsuario = event.idUsuario; // ID de usuario dinámico pasado en el evento
    const tipo = "claro-store-sesion"; // Tipo fijo para la sesión
    const ttl = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // Tiempo actual + 7 días en segundos
    const fechaActual = new Date().toLocaleString("es-SV", {
      timeZone: "America/El_Salvador",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    // Parámetros para verificar si ya existe la sesión
    const queryParams = {
      TableName: "general-storage",
      KeyConditionExpression: "tipo = :tipo AND id = :idUsuario", // Clave de partición y clave de ordenamiento
      ExpressionAttributeValues: {
        ":tipo": tipo, // Valor fijo para tipo
        ":idUsuario": idUsuario, // ID dinámico del usuario
      },
    };

    console.log("Params enviados para consulta:", JSON.stringify(queryParams));

    // Ejecutar el comando Query para buscar la sesión
    const queryResult = await ddb.send(new QueryCommand(queryParams));
    console.log("Respuesta de DynamoDB (Query):", JSON.stringify(queryResult));

    // Si la sesión ya existe, retornarla
    if (queryResult.Items && queryResult.Items.length > 0) {
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        },
        body: JSON.stringify({
          message: "Sesión existente",
          data: queryResult.Items[0],
        }),
      };
    }

    // Parámetros para actualizar o crear la sesión
    const updateParams = {
      TableName: "general-storage",
      Key: {
        tipo: tipo,
        id: idUsuario,
      },
      UpdateExpression: `
        SET carrito = if_not_exists(carrito, :carrito),
            duiEmpleado = :duiEmpleado,
            duiEmpresa = :duiEmpresa,
            empleadoName = :empleadoName,
            empresaName = :empresaName,
            estatus = :estatus,
            fecha = :fecha,
            total = :total,
            ttl = :ttl,
            user_id = :user_id
      `,
      ExpressionAttributeValues: {
        ":carrito": [], // Inicia vacío si no existe
        ":duiEmpleado": idUsuario,
        ":duiEmpresa": event.duiEmpresa, // Suponiendo que viene en el evento
        ":empleadoName": event.nombreEmpleado, // Suponiendo que viene en el evento
        ":empresaName": event.nombreEmpresa, // Suponiendo que viene en el evento
        ":estatus": "Pendiente",
        ":fecha": fechaActual,
        ":total": 0,
        ":ttl": ttl,
        ":user_id": `${tipo}|${idUsuario}`,
      },
      ReturnValues: "ALL_NEW", // Devuelve todos los valores actualizados o creados
    };

    console.log("Params enviados para actualización:", JSON.stringify(updateParams));

    // Ejecutar el comando Update
    const updateResult = await ddb.send(new UpdateCommand(updateParams));
    console.log("Respuesta de DynamoDB (Update):", JSON.stringify(updateResult));

    // Responder con los datos obtenidos o actualizados
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      },
      body: JSON.stringify({
        message: "Sesión actualizada o creada con éxito",
        data: updateResult.Attributes,
      }),
    };
  } catch (error) {
    console.error("Error al ejecutar la consulta en DynamoDB:", error);

    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      },
      body: JSON.stringify({ error: "Error al obtener o actualizar la sesión" }),
    };
  }
};
