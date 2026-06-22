# Refactorización del Frontend (Multi-Tenant)

Ahora que tienes tu perfil de empresa creado en la base de datos, el siguiente paso crítico es conectar nuestras pantallas de la aplicación para que apunten a las nuevas tablas que creamos, asegurándonos de enviar el `tenant_id` en cada operación para cumplir con las políticas RLS.

## Proposed Changes

### 1. Refactorización de Clientes
#### [MODIFY] `frontend/src/pages/Clients.jsx`
- Obtener el `tenantId` usando `useTenantStore()`.
- Insertar el `tenant_id` al crear un nuevo cliente.
- Asegurar que la lectura respeta la tabla y columnas actuales.

### 2. Refactorización de Inventario
#### [MODIFY] `frontend/src/pages/Inventory.jsx`
- Obtener el `tenantId` y `branchId` (sucursal) si aplica, pero principalmente `tenantId`.
- Al crear un producto, inyectar el `tenant_id`.
- Modificar el flujo de agregar producto a la tabla `products` y su registro inicial en `inventory`.

### 3. Refactorización de Ventas (POS)
#### [MODIFY] `frontend/src/pages/Ventas.jsx`
- Cambiar la lectura de `products` y `clients`.
- Cambiar la tabla destino de `orders` a `sales`.
- Modificar la estructura del insert de la venta para que coincida con `sales`: `subtotal`, `tax_iva`, `total`, `status`, `client_id`, `tenant_id`, `branch_id`.
- El proceso simulará la inserción del DTE en la tabla `dtes` (ya no `documents`).

### 4. Refactorización de Documentos
#### [MODIFY] `frontend/src/pages/Documents.jsx`
- Leer desde la tabla `dtes` en lugar de `documents`.
- Hacer join con `sales` para obtener el cliente, ya que ahora `dtes` se relaciona con `sales` (`sale_id`) y `sales` con `clients` (`client_id`). O alternativamente actualizar la interfaz para mostrar lo que hay en `dtes`.

## User Review Required
> [!IMPORTANT]
> Si pudiste completar el formulario de Onboarding exitosamente en tu navegador y ya ves el menú de la aplicación, aprueba este plan para que yo proceda a inyectar toda esta lógica en el código fuente y que tus pantallas vuelvan a funcionar.
