const { DynamoDBClient, GetItemCommand, UpdateItemCommand } = require("@aws-sdk/client-dynamodb");

const dynamoDB = new DynamoDBClient({ region: "us-east-1" });

exports.handler = async (event) => {
  const fechaActual = new Date().toLocaleString("es-SV", {
    timeZone: "America/El_Salvador",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

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

    const { tipo, duiEmpleado, carrito, estatus } = body;

    // Validar los parámetros necesarios
    if (!tipo || !duiEmpleado || !carrito) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          message: "Todos los campos son requeridos: tipo, duiEmpleado, carrito.",
        }),
      };
    }

    // Obtener el carrito actual desde DynamoDB
    const getItemParams = {
      TableName: "general-storage",
      Key: {
        tipo: { S: tipo },
        id: { S: duiEmpleado },
      },
      ProjectionExpression: "carrito", // Solo obtenemos el carrito
    };

    const currentData = await dynamoDB.send(new GetItemCommand(getItemParams));
    let currentCarrito = currentData.Item?.carrito?.L || [];

    // Actualizar el carrito con los nuevos datos
    carrito.forEach((newItem) => {
      const existingItemIndex = currentCarrito.findIndex(
        (item) => item.M.id.S === newItem.id
      );
    
      if (existingItemIndex >= 0) {
        // Si el producto existe, actualizar su cantidad
        const existingItem = currentCarrito[existingItemIndex];
        const currentCantidad = parseInt(existingItem.M.cantidad.N, 10); // Convertir a número
        const newCantidad = parseInt(newItem.cantidad, 10); // Convertir a número
        existingItem.M.cantidad.N = (currentCantidad + newCantidad).toString(); // Sumar y convertir de vuelta a texto
      } else {
        // Si no existe, agregar como nuevo
        currentCarrito.push({
          M: {
            id: { S: newItem.id },
            cantidad: { N: newItem.cantidad.toString() },
            electronico: { S: newItem.electronico },
            nombre: { S: newItem.nombre },
            imagen: { S: newItem.imagen },
            precio: { N: newItem.precio.toString() },
            tipo: { S: newItem.tipo },
          },
        });
      }
    });
    
    // Parámetros para actualizar DynamoDB
    const updateParams = {
      TableName: "general-storage",
      Key: {
        tipo: { S: tipo },
        id: { S: duiEmpleado },
      },
      UpdateExpression: `
        SET 
          estatus = :estatus,
          fecha = :fecha,
          #carritoAlias = :updatedCarrito
      `,
      ExpressionAttributeNames: {
        "#carritoAlias": "carrito", // Alias para el atributo reservado `carrito`
      },
      ExpressionAttributeValues: {
        ":estatus": { S: estatus || "Pendiente" },
        ":fecha": { S: fechaActual },
        ":updatedCarrito": { L: currentCarrito },
      },
      ReturnValues: "UPDATED_NEW",
    };

    // Enviar el comando de actualización
    const result = await dynamoDB.send(new UpdateItemCommand(updateParams));

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
    console.error("Error al procesar la solicitud:", {
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
