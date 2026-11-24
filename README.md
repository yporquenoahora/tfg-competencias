# Seguimiento de Competencias Transversales en Formación Profesional

Aplicación web para la configuración, observación y seguimiento de competencias transversales del alumnado de Formación Profesional.

Este proyecto se desarrolla como **Trabajo Fin de Grado (TFG) de Ingeniería Informática** y tiene como finalidad proporcionar al profesorado una herramienta para registrar y analizar la evolución de competencias transversales mediante indicadores observables, actividades y evaluaciones realizadas a lo largo del tiempo.

## Descripción del proyecto

Las competencias transversales, como la autonomía, el trabajo en equipo, la comunicación o la resolución de problemas, desempeñan un papel relevante en la formación del alumnado.

Sin embargo, su observación y seguimiento pueden resultar difíciles cuando no se dispone de herramientas específicas que permitan registrar evidencias de manera estructurada.

Esta aplicación pretende facilitar ese proceso mediante una plataforma web en la que el docente pueda:

- Definir las competencias transversales que desea observar.
- Asociar indicadores observables a cada competencia.
- Configurar rúbricas y niveles de desempeño.
- Registrar actividades y evidencias de aprendizaje.
- Realizar valoraciones fechadas del alumnado.
- Consultar la evolución individual y grupal.
- Relacionar opcionalmente las competencias con resultados de aprendizaje y criterios de evaluación del currículo.

La herramienta se plantea como un **instrumento complementario de seguimiento formativo**, sin modificar las calificaciones oficiales de los módulos profesionales.

## Contexto educativo

El proyecto toma como referencia el ciclo formativo de Grado Superior de **Desarrollo de Aplicaciones Multiplataforma (DAM)** y, concretamente, el módulo profesional **0373. Lenguajes de Marcas y Sistemas de Gestión de Información**.

Este contexto se utilizará para definir ejemplos de competencias, indicadores, actividades y casos de prueba.

La aplicación está diseñada para que sus elementos de seguimiento puedan configurarse y adaptarse a otros módulos o contextos de Formación Profesional.

## Tecnologías utilizadas

| Componente | Tecnología |
|---|---|
| Frontend | Svelte |
| Herramienta de desarrollo frontend | Vite |
| Backend | Node.js |
| API REST | Express |
| Base de datos | PostgreSQL |
| ORM y migraciones | Prisma |
| Lenguaje principal | JavaScript |
| Control de versiones | Git y GitHub |

## Arquitectura general

La aplicación sigue una arquitectura cliente-servidor.

```text
┌───────────────────────┐
│   Frontend (Svelte)   │
│   Interfaz del docente│
└───────────┬───────────┘
            │ HTTP / JSON
            ▼
┌───────────────────────┐
│    Backend (Express)  │
│        API REST       │
└───────────┬───────────┘
            │ Prisma ORM
            ▼
┌───────────────────────┐
│      PostgreSQL       │
│   Persistencia datos  │
└───────────────────────┘
```

El frontend consume los servicios REST del backend, que se encarga de gestionar el acceso a los datos mediante Prisma.

## Estado del desarrollo

El proyecto se encuentra en una **fase inicial de implementación**.

### Implementado y comprobado

- [x] Creación del proyecto frontend con Svelte y Vite.
- [x] Configuración del servidor backend con Node.js y Express.
- [x] Comunicación entre frontend y backend.
- [x] Instalación y configuración de PostgreSQL.
- [x] Integración de Prisma con PostgreSQL.
- [x] Creación inicial de los modelos `Competencia` e `Indicador`.
- [x] Aplicación de migraciones de base de datos.
- [x] Comprobación de consultas a PostgreSQL desde Node.js.
- [x] API REST para consultar competencias transversales.
- [x] API REST para registrar competencias transversales.

### En desarrollo o pendiente de validación

- [ ] Interfaz de gestión de competencias en Svelte.
- [ ] Gestión de indicadores observables.
- [ ] Configuración de rúbricas y niveles de desempeño.
- [ ] Gestión de actividades y evidencias.
- [ ] Registro de observaciones y evaluaciones fechadas.
- [ ] Visualización de la evolución individual y grupal.
- [ ] Vinculación opcional con elementos curriculares.
- [ ] Autenticación y autorización de docentes.
- [ ] Pruebas automatizadas de backend y frontend.

## Estructura del proyecto

```text
tfg-competencias/
├── client/                  # Aplicación frontend Svelte
│   ├── src/
│   ├── package.json
│   └── ...
│
├── server/                  # API REST Express
│   ├── prisma/
│   │   ├── schema.prisma    # Modelos de datos
│   │   └── migrations/      # Migraciones
│   ├── src/
│   │   ├── index.js         # Servidor y rutas
│   │   └── db.js            # Conexión Prisma
│   ├── package.json
│   └── ...
│
└── README.md
```

Esta estructura podrá evolucionar conforme se incorporen nuevas funcionalidades.

## Requisitos previos

Para ejecutar el proyecto en un entorno local se necesita:

- Node.js compatible con las dependencias del proyecto.
- npm.
- PostgreSQL.
- Git, opcional para la ejecución local.

## Instalación y ejecución

### 1. Clonar el repositorio

```bash
git clone https://github.com/USUARIO/NOMBRE-REPOSITORIO.git
cd NOMBRE-REPOSITORIO
```

Sustituir la URL de ejemplo por la dirección real del repositorio.

### 2. Configurar PostgreSQL

Crear un usuario y una base de datos para la aplicación:

```sql
CREATE USER tfg_app WITH PASSWORD 'CONTRASENA_SEGURA';
CREATE DATABASE tfg_competencias OWNER tfg_app;
```

Estas instrucciones son un ejemplo de configuración local. Se recomienda utilizar credenciales propias y no incluirlas en el repositorio.

### 3. Configurar el backend

```bash
cd server
npm install
```

Crear un archivo `.env` dentro de `server`:

```env
DATABASE_URL="postgresql://tfg_app:TU_CONTRASENA@localhost:5432/tfg_competencias"
PORT=3000
```

Sustituir `TU_CONTRASENA` por la contraseña configurada en PostgreSQL.

Aplicar las migraciones existentes:

```bash
npx prisma migrate deploy
```

Generar Prisma Client:

```bash
npx prisma generate
```

Iniciar el servidor:

```bash
npm run dev
```

La API estará disponible en:

`http://localhost:3000`

### 4. Configurar el frontend

Desde otra terminal:

```bash
cd client
npm install
npm run dev
```

La aplicación frontend estará disponible normalmente en:

`http://localhost:5173`

## Recorrido por la aplicación

- **Alumno** permite seleccionar a un estudiante, revisar su historial y registrar observaciones en el módulo activo.
- **Grupo** muestra el seguimiento agregado del módulo y ofrece acceso a las fichas individuales.
- **Grupo actual** cambia el grupo de trabajo. Con **Nuevo grupo** puedes crear otro e indicar su ciclo. Cada grupo tiene sus propias matrículas e imparticiones.
- El selector **Módulo activo** de la cabecera cambia el contexto en todas las vistas. **Catálogo** permite guardar una selección de indicadores para ese módulo.
- Para incorporar un módulo nuevo al grupo actual, abre **Módulos** o pulsa **Añadir módulo**. Busca el módulo por nombre, especialidad (INF, SAI o TEC) entre las fichas compatibles con el ciclo del grupo activo. Abre la ficha para consultar los resultados de aprendizaje y criterios de evaluación. Pulsa **Añadir al grupo** para activar el módulo con su currículo y pasar a **Catálogo**.

La primera carga curricular cubre las atribuciones identificadas en los reales decretos 497–500/2024, el curso de especialización en Python y las optativas madrileñas CMO-310 a CMO-318. Para Tecnología, la ficha del proyecto colaborativo de grado básico identifica la atribución vinculada al ámbito de Ciencias Aplicadas. Las fichas mantienen la fuente del currículo y la atribución por ciclo. Las variantes con el mismo código y resultados de aprendizaje distintos se mantienen como fichas independientes. Cuando la fuente repite una etiqueta, se añade un sufijo interno para distinguir ambas entradas.

El alta desde la interfaz registra el currículo y la impartición en una misma operación. Para asociar un indicador concreto a un criterio curricular, se utiliza la API `POST /api/indicadores/:id/criterios` con `criterioId`.

## Demo de defensa

Con la base configurada y las migraciones aplicadas, ejecuta `node scripts/preparar-demo.mjs` desde `server`. Se crean cinco grupos identificados con «· Demo», sus matrículas, una impartición y dos quincenas de observaciones sintéticas de septiembre de 2026. Volver a ejecutar el comando conserva los grupos demo que ya existen. Los CSV de `server/demo` también se pueden usar por separado para ensayar la importación manual en **Grupo**.

1. Abre **Curso** y pulsa **Ver dificultad compartida**. En Lenguajes de Marcas aparecen 8 alumnos con dificultad de 19 observados. Hay un alumno sin observaciones.
2. Selecciona la celda de una impartición. **Grupo** abre esa quincena con un gráfico por indicador y sus referentes curriculares, si están vinculados. Se cuentan las últimas observaciones por alumno e indicador durante el periodo. La revisión prioritaria usa también la observación inmediatamente anterior si precede al intervalo.
3. Vuelve a **Curso** y pulsa **Ver evolución tras el refuerzo**. En la segunda quincena quedan 3 de 19 con dificultades. En el detalle, abre un alumno con refuerzo y registra si queda pendiente, en progreso o revisado. El panel muestra el estado actual del plan.
4. En **Alumno**, amplía el intervalo de informe a `01/09/2026–30/09/2026` y genera el documento imprimible para ver ambas observaciones. **Reiniciar vista** limpia los filtros de la línea temporal y mantiene los datos registrados.

Desde **Curso → Añadir hito de revisión**, elige el grupo y el módulo, una fecha entre septiembre y junio y qué revisar. Por ejemplo, programa «Validación XML antes de la entrega» con una nota sobre los errores que interesa observar. La línea temporal cuenta los hitos pendientes incluso en quincenas sin valoraciones. **Abrir seguimiento** lleva a la quincena del hito y **Marcar revisado** registra que el docente ha hecho la comprobación.

El gráfico de **Curso** muestra una impartición cada vez. Las barras agrupan al alumnado según el balance de entradas y salidas del nivel de dificultad en los mismos indicadores respecto a la quincena anterior. La línea indica el porcentaje con alguna dificultad entre el alumnado observado. Una quincena sin datos se distingue de un 0 %. Las actividades que aparecen proceden de las evidencias vinculadas a observaciones del periodo. Los grupos sin módulo se muestran aparte. Un módulo del catálogo puede existir sin impartición, y requiere asociarse a un grupo para registrar seguimiento.

### Trazabilidad curricular y programación didáctica

El currículo se almacena como **módulo → resultado de aprendizaje → criterio de evaluación**. Cada CE pertenece a un RA. La tabla `IndicadorCriterio` relaciona indicadores de seguimiento con CE y las vistas filtran las asociaciones por el currículo de la impartición activa. Los vínculos se dan de alta mediante `POST /api/indicadores/:id/criterios` o se preparan en la carga sintética. Son asociaciones pedagógicas orientativas.

El circuito de evidencias es **actividad de la impartición → evidencia de un alumno → valoración del indicador**. Para documentar la programación didáctica, declara en ella qué **unidad de trabajo** incluye cada actividad, qué RA y CE se trabajan y qué instrumento recoge la evidencia. En esta versión se puede identificar la unidad en el título o la descripción de la actividad. El modelo carece de una entidad «Unidad de trabajo» y de una relación directa actividad–CE. La asociación por indicador permanece diferenciada de una calificación curricular.

## API REST inicial

Actualmente se dispone de los siguientes endpoints:

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health` | Comprueba el funcionamiento del servidor |
| GET | `/api/competencias` | Obtiene las competencias y sus indicadores |
| POST | `/api/competencias` | Registra una nueva competencia |

### Ejemplo de creación de una competencia

Petición:

```http
POST /api/competencias
Content-Type: application/json
```

Cuerpo:

```json
{
  "nombre": "Trabajo en equipo",
  "descripcion": "Capacidad para colaborar y coordinar tareas con otras personas."
}
```

La API devuelve la competencia creada junto con su identificador y fecha de registro.

**Nota:** los endpoints actuales forman parte de un prototipo de desarrollo local y todavía no incorporan autenticación. No deben exponerse públicamente sin las medidas de seguridad correspondientes.

## Modelo de datos inicial

El primer esquema relacional incluye dos entidades principales:

**Competencia**

Representa una competencia transversal definida por el docente. Contiene un identificador, nombre, descripción opcional y fecha de creación.

**Indicador**

Representa una conducta o característica observable asociada a una competencia. Cada competencia puede tener varios indicadores.

La relación entre ambas entidades es de **uno a muchos (1:N)**.

En fases posteriores se ampliará el modelo con rúbricas, actividades, estudiantes, evidencias, observaciones y relaciones curriculares.

## Pruebas y validación

Durante el desarrollo se realizan comprobaciones incrementales de funcionamiento, entre ellas:

- Disponibilidad de la API REST.
- Comunicación entre Svelte y Express.
- Conexión del backend con PostgreSQL.
- Aplicación de migraciones mediante Prisma.
- Consulta y creación de competencias.
- Persistencia de los registros en la base de datos.

Se prevé incorporar pruebas automatizadas y ampliar la validación funcional conforme avance el proyecto.

## Alcance del TFG

El objetivo principal es diseñar e implementar un prototipo funcional que permita gestionar el seguimiento de competencias transversales en Formación Profesional.

La validación se centrará en el funcionamiento técnico de la aplicación y en escenarios de uso representativos con datos de prueba.

No se pretende demostrar experimentalmente una mejora del rendimiento académico ni sustituir los procedimientos oficiales de evaluación.

## Licencia

Licencia pendiente de definir.

## Estado del repositorio

**Proyecto académico en desarrollo.** La estructura, las funcionalidades y la documentación podrán modificarse durante la implementación del TFG.