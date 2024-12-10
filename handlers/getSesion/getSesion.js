const { QueryCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const ddb = require("../../utils/db"); // Configuración de DynamoDB

exports.handler = async (event) => {
  try {
    const idUsuario = event.queryStringParameters?.idUsuario;
    const tipo = "claro-store-sesion";

    if (!idUsuario) {
      throw new Error("El ID de usuario (idUsuario) es obligatorio");
    }

    // Verificar si ya existe la sesión
    const params = {
      TableName: "general-storage",
      KeyConditionExpression: "tipo = :tipo AND id = :idUsuario",
      ExpressionAttributeValues: {
        ":tipo": tipo,
        ":idUsuario": idUsuario,
      },
    };
    const data = await ddb.send(new QueryCommand(params));

    if (data.Items && data.Items.length > 0) {
      // Sesión encontrada
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        },
        body: JSON.stringify({
          message: "Sesión encontrada",
          data: data.Items[0],
        }),
      };
    }

    // Crear nueva sesión con UpdateCommand
    const ttl = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // TTL de 7 días
    const fechaActual = new Date().toLocaleString("es-SV", {
      timeZone: "America/El_Salvador",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const updateParams = {
      TableName: "general-storage",
      Key: { tipo, id: idUsuario },
      UpdateExpression: `
        SET carrito = if_not_exists(carrito, :carrito),
            duiEmpleado = :duiEmpleado,
            duiEmpresa = :duiEmpresa,
            empleadoName = :empleadoName,
            empresaName = :empresaName,
            estatus = :estatus,
            fecha = :fecha,
            #total = if_not_exists(#total, :total),
            #ttl = :ttl,
            user_id = :user_id
      `,
      ExpressionAttributeNames: {
        "#total": "total", // Alias para palabra reservada
        "#ttl": "ttl",
      },
      ExpressionAttributeValues: {
        ":carrito": [],
        ":duiEmpleado": idUsuario,
        ":duiEmpresa": "090090990",
        ":empleadoName": "Marta Sanchez",
        ":empresaName": "Super Selectos",
        ":estatus": "Pendiente",
        ":fecha": fechaActual,
        ":total": 0,
        ":ttl": ttl,
        ":user_id": `claro-store-sesion|${idUsuario}`,
      },
      ReturnValues: "ALL_NEW",
    };

    try {
      const updatedData = await ddb.send(new UpdateCommand(updateParams));
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        },
        body: JSON.stringify({
          message: "Nueva sesión creada",
          data: updatedData.Attributes,
        }),
      };
    } catch (updateError) {
      console.error("Error al crear la sesión:", updateError);
      return {
        statusCode: 200, // Seguimos con un 200 para evitar que Axios lo trate como error
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        },
        body: JSON.stringify({
          message: "Error creando nueva sesión, pero no se detendrá el flujo",
          error: updateError.message,
        }),
      };
    }
  } catch (error) {
    console.error("Error general:", error);

    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
