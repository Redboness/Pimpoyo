-- =====================================================================
-- Script para RE-CREAR las tablas (con columnas adicionales en sesiones)
-- =====================================================================

-- Eliminar tablas existentes en orden inverso de dependencia o usando CASCADE. Descomentar SOLO si es necesario.
-- DROP TABLE IF EXISTS eventos_uso CASCADE;
-- DROP TABLE IF EXISTS interacciones CASCADE;
-- DROP TABLE IF EXISTS sesiones CASCADE;

-- Tabla para la Información de Sesión / Usuario (Sección A)
-- Incluye hashed_password y avatar_url directamente
CREATE TABLE sesiones (
    sesion_id BIGSERIAL PRIMARY KEY,
    apodo VARCHAR(50) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL, -- Almacena el hash de la contraseña
    inicio_sesion_ts TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    edad INTEGER NOT NULL,
    genero VARCHAR(50),
    curso_escolar VARCHAR(100),
    avatar_url VARCHAR(512) NULL,
    consentimiento_obtenido BOOLEAN NOT NULL,
    puntuacion_pre_test FLOAT, -- Puntuación antes de iniciar la actividad principal
    fin_sesion_ts TIMESTAMP WITH TIME ZONE, -- Se actualiza al cerrar sesión o finalizar
    duracion_total_sesion_seg INTEGER, -- Calculado: fin_sesion_ts - inicio_sesion_ts
    puntuacion_final FLOAT, -- Puntuación acumulada al final
    interacciones_totales_sesion INTEGER DEFAULT 0, -- Total de noticias evaluadas
    precision_global_sesion FLOAT, -- Tasa de acierto general (0.0 a 1.0)
    tasa_falsos_negativos_global FLOAT, -- Tasa de noticias falsas creídas verdaderas
    tasa_falsos_positivos_global FLOAT, -- Tasa de noticias verdaderas creídas falsas
    puntuacion_post_test FLOAT -- Puntuación después de finalizar la actividad principal
);

-- Comentarios para la tabla sesiones
COMMENT ON TABLE sesiones IS 'Almacena la información del perfil de cada usuario (identificado por sesion_id) y estadísticas agregadas de su desempeño.';
COMMENT ON COLUMN sesiones.sesion_id IS 'ID numérico único y auto-incremental para el usuario (BIGSERIAL). Es el identificador principal del usuario.';
COMMENT ON COLUMN sesiones.apodo IS 'Nickname proporcionado por el usuario.';
COMMENT ON COLUMN sesiones.hashed_password IS 'Hash seguro de la contraseña del usuario.';
COMMENT ON COLUMN sesiones.inicio_sesion_ts IS 'Timestamp exacto del primer inicio de sesión o creación del usuario.';
COMMENT ON COLUMN sesiones.edad IS 'Edad del niño participante.';
COMMENT ON COLUMN sesiones.genero IS 'Género del participante.';
COMMENT ON COLUMN sesiones.curso_escolar IS 'Curso escolar del participante.';
COMMENT ON COLUMN sesiones.avatar_url IS 'URL del avatar seleccionado por el usuario.';
COMMENT ON COLUMN sesiones.consentimiento_obtenido IS 'Booleano (True/False) confirmando el consentimiento parental/tutor.';
COMMENT ON COLUMN sesiones.puntuacion_pre_test IS 'Puntuación obtenida en una evaluación previa al uso, si aplica.';
COMMENT ON COLUMN sesiones.fin_sesion_ts IS 'Timestamp exacto de la última actividad o cierre de sesión (si aplica).';
COMMENT ON COLUMN sesiones.duracion_total_sesion_seg IS 'Duración total que el usuario ha interactuado con la aplicación en segundos (puede ser acumulativa).';
COMMENT ON COLUMN sesiones.puntuacion_final IS 'Puntuación total acumulada por el usuario en las actividades.';
COMMENT ON COLUMN sesiones.interacciones_totales_sesion IS 'Número total de noticias que el usuario ha evaluado.';
COMMENT ON COLUMN sesiones.precision_global_sesion IS 'Tasa de acierto general del usuario (aciertos / interacciones_totales_sesion).';
COMMENT ON COLUMN sesiones.tasa_falsos_negativos_global IS 'Tasa global de noticias falsas que el usuario clasificó incorrectamente como verdaderas.';
COMMENT ON COLUMN sesiones.tasa_falsos_positivos_global IS 'Tasa global de noticias verdaderas que el usuario clasificó incorrectamente como falsas.';
COMMENT ON COLUMN sesiones.puntuacion_post_test IS 'Puntuación obtenida en una evaluación posterior al uso, si aplica.';

-- Tabla para los Detalles de Interacción (Sección B)
CREATE TABLE interacciones (
    interaccion_id BIGSERIAL PRIMARY KEY,
    sesion_id BIGINT NOT NULL REFERENCES sesiones(sesion_id) ON DELETE CASCADE,
    interaccion_ts TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    noticia_id_json VARCHAR(255) NOT NULL, -- Identificador de la noticia correspondiente al "ID" en tu JSON
    noticia_fuente_json VARCHAR(255), -- Fuente de la noticia (copiada del JSON, ej. "El Economista")
    noticia_verdad_real_json VARCHAR(50) NOT NULL, -- Veracidad real (copiada del JSON, ej. "TRUE", "FALSE")
    noticia_tema_json VARCHAR(100), -- Tema (copiado del JSON, ej. "Covid-19")
    noticia_dificultad_json VARCHAR(50), -- Dificultad (copiada del JSON, ej. "alto")
    noticia_tipos_razonamiento_json TEXT[], -- REASONING_TYPE (copiado del JSON en el momento de la interacción)
    respuesta_usuario VARCHAR(50) NOT NULL, -- Respuesta del usuario (ej. "TRUE", "FALSE")
    es_correcto BOOLEAN NOT NULL, -- True si la respuesta_usuario es correcta
    tiempo_respuesta_ms INTEGER, -- Tiempo de respuesta en milisegundos
    puntos_otorgados INTEGER DEFAULT 0,
    tipo_error VARCHAR(100), -- Ej. "FALSO_POSITIVO", "FALSO_NEGATIVO" (si es_correcto es False)
    feedback_mostrado TEXT, -- Descripción del feedback que se le dio al usuario
    secuencia_interaccion INTEGER NOT NULL, -- Orden de esta interacción dentro de la actividad para este usuario
    criterios_evaluacion_ids JSONB, -- Opcional: IDs de Criterios de Evaluación curriculares
    indicadores_seleccionados_usuario TEXT[] -- Indicadores que el usuario seleccionó para justificar su respuesta

    -- Clave Foránea hacia la tabla 'sesiones'
    CONSTRAINT fk_sesion
        FOREIGN KEY(sesion_id)
        REFERENCES sesiones(sesion_id)
        ON DELETE RESTRICT,

    -- Restricción para que la secuencia sea única por sesión
    UNIQUE (sesion_id, secuencia_interaccion)
);

-- Índices y comentarios para la tabla interacciones
CREATE INDEX idx_interacciones_sesion_id ON interacciones (sesion_id);
CREATE INDEX idx_interacciones_noticia_id ON interacciones (noticia_id);
CREATE INDEX idx_interacciones_timestamp ON interacciones (interaccion_ts);

COMMENT ON COLUMN interacciones.interaccion_id IS 'ID único para esta interacción específica';
COMMENT ON COLUMN interacciones.sesion_id IS 'FK a la tabla sesiones (BIGINT), vincula la interacción al usuario/sesión';
COMMENT ON COLUMN interacciones.interaccion_ts IS 'Timestamp exacto de la interacción';
COMMENT ON COLUMN interacciones.noticia_id IS 'Identificador único de la noticia presentada';
COMMENT ON COLUMN interacciones.noticia_fuente IS 'Origen de la noticia (ej. generada_por_error_X, set_inicial_Y)';
COMMENT ON COLUMN interacciones.noticia_verdad_real IS 'Clasificación real de la noticia (VERDADERA, FALSA, SATIRA, etc.)';
COMMENT ON COLUMN interacciones.noticia_tema IS 'Tema de la noticia (CIENCIA, DEPORTES, etc.)';
COMMENT ON COLUMN interacciones.noticia_dificultad IS 'Nivel de dificultad asignado a la noticia';
COMMENT ON COLUMN interacciones.respuesta_usuario IS 'La respuesta dada por el niño (VERDADERA, FALSA, etc.)';
COMMENT ON COLUMN interacciones.es_correcto IS 'Booleano (True/False) indicando si la respuesta fue correcta';
COMMENT ON COLUMN interacciones.tiempo_respuesta_ms IS 'Tiempo de respuesta en milisegundos';
COMMENT ON COLUMN interacciones.puntos_otorgados IS 'Puntos otorgados por esta interacción específica';
COMMENT ON COLUMN interacciones.tipo_error IS 'Categoría del error (FALSO_POSITIVO, FALSO_NEGATIVO, etc.) si es_correcto es False';
COMMENT ON COLUMN interacciones.feedback_mostrado IS 'Tipo de feedback o explicación mostrada al niño';
COMMENT ON COLUMN interacciones.secuencia_interaccion IS 'Número de orden de esta interacción en la sesión (1, 2, 3...)';
COMMENT ON COLUMN interacciones.criterios_evaluacion_ids IS 'Array JSON con códigos oficiales de los Criterios de Evaluación curriculares abordados';
COMMENT ON COLUMN interacciones.noticia_id_json IS 'Identificador de la noticia utilizado en el archivo JSON.';


-- Tabla para el Uso de Funcionalidades / Comportamiento (Sección C)
CREATE TABLE eventos_uso (
    evento_id BIGSERIAL PRIMARY KEY,
    sesion_id BIGINT NOT NULL,
    evento_ts TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    funcionalidad_usada VARCHAR(255) NOT NULL,
    contexto TEXT,

    -- Clave Foránea hacia la tabla 'sesiones'
    CONSTRAINT fk_sesion_evento
        FOREIGN KEY(sesion_id)
        REFERENCES sesiones(sesion_id)
        ON DELETE RESTRICT
);

-- Índices y comentarios para la tabla eventos_uso
CREATE INDEX idx_eventos_sesion_id ON eventos_uso (sesion_id);
CREATE INDEX idx_eventos_timestamp ON eventos_uso (evento_ts);
CREATE INDEX idx_eventos_funcionalidad_usada ON eventos_uso (funcionalidad_usada);

COMMENT ON COLUMN eventos_uso.evento_id IS 'Identificador único para el evento de uso';
COMMENT ON COLUMN eventos_uso.sesion_id IS 'FK a la tabla sesiones (BIGINT), vincula el evento al usuario/sesión';
COMMENT ON COLUMN eventos_uso.evento_ts IS 'Timestamp exacto del evento';
COMMENT ON COLUMN eventos_uso.funcionalidad_usada IS 'Nombre de la función utilizada (ej. click_pedir_pista, consulta_estadisticas)';
COMMENT ON COLUMN eventos_uso.contexto IS 'Información adicional sobre el contexto del evento (ej. en qué noticia pidió pista)';

CREATE TABLE glosario_usuario (
    id SERIAL PRIMARY KEY,
    usuario_sesion_id BIGINT NOT NULL REFERENCES sesiones(sesion_id),
    termino VARCHAR(100) NOT NULL,
    definicion TEXT NOT NULL,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_usuario_termino UNIQUE (usuario_sesion_id, termino)
);

-- Crear un índice en la clave foránea puede mejorar el rendimiento
CREATE INDEX ix_glosario_usuario_usuario_sesion_id ON glosario_usuario (usuario_sesion_id);

-- Permisos para el usuario laydatfm
GRANT USAGE ON SCHEMA public TO laydatfm;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE sesiones TO laydatfm;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE interacciones TO laydatfm;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE eventos_uso TO laydatfm;

GRANT USAGE, SELECT ON SEQUENCE sesiones_sesion_id_seq TO laydatfm;
GRANT USAGE, SELECT ON SEQUENCE interacciones_interaccion_id_seq TO laydatfm;
GRANT USAGE, SELECT ON SEQUENCE eventos_uso_evento_id_seq TO laydatfm;
GRANT SELECT, INSERT ON TABLE glosario_usuario TO laydatfm;
GRANT USAGE, SELECT ON SEQUENCE glosario_usuario_id_seq TO laydatfm;

CREATE TABLE interacciones (
    interaccion_id BIGSERIAL PRIMARY KEY,
    sesion_id BIGINT NOT NULL REFERENCES sesiones(sesion_id) ON DELETE CASCADE,
    interaccion_ts TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    noticia_id_json VARCHAR(255) NOT NULL, -- Identificador de la noticia correspondiente al "ID" en tu JSON
    noticia_fuente_json VARCHAR(255), -- Fuente de la noticia (copiada del JSON, ej. "El Economista")
    noticia_verdad_real_json VARCHAR(50) NOT NULL, -- Veracidad real (copiada del JSON, ej. "TRUE", "FALSE")
    noticia_tema_json VARCHAR(100), -- Tema (copiado del JSON, ej. "Covid-19")
    noticia_dificultad_json VARCHAR(50), -- Dificultad (copiada del JSON, ej. "alto")
    noticia_tipos_razonamiento_json TEXT[], -- REASONING_TYPE (copiado del JSON en el momento de la interacción)
    respuesta_usuario VARCHAR(50) NOT NULL, -- Respuesta del usuario (ej. "TRUE", "FALSE")
    es_correcto BOOLEAN NOT NULL, -- True si la respuesta_usuario es correcta
    tiempo_respuesta_ms INTEGER, -- Tiempo de respuesta en milisegundos
    puntos_otorgados INTEGER DEFAULT 0,
    tipo_error VARCHAR(100), -- Ej. "FALSO_POSITIVO", "FALSO_NEGATIVO" (si es_correcto es False)
    feedback_mostrado TEXT, -- Descripción del feedback que se le dio al usuario
    secuencia_interaccion INTEGER NOT NULL, -- Orden de esta interacción dentro de la actividad para este usuario
    criterios_evaluacion_ids JSONB, -- Opcional: IDs de Criterios de Evaluación curriculares
    indicadores_seleccionados_usuario TEXT[] -- Indicadores que el usuario seleccionó para justificar su respuesta
);

-- Índices para la tabla interacciones
CREATE INDEX IF NOT EXISTS idx_interacciones_sesion_id ON interacciones (sesion_id);
CREATE INDEX IF NOT EXISTS idx_interacciones_noticia_id_json ON interacciones (noticia_id_json);

-- Comentarios para la tabla interacciones
COMMENT ON TABLE interacciones IS 'Registra cada interacción de un usuario con una noticia, incluyendo su respuesta y detalles relevantes de la noticia copiados del JSON.';
COMMENT ON COLUMN interacciones.sesion_id IS 'FK a la tabla sesiones, vincula la interacción al usuario.';
COMMENT ON COLUMN interacciones.noticia_id_json IS 'Identificador de la noticia utilizado en el archivo JSON.';
COMMENT ON COLUMN interacciones.noticia_tipos_razonamiento_json IS 'Array de los tipos de razonamiento requeridos por la noticia, copiados del JSON (campo REASONING_TYPE) en el momento de la interacción.';
COMMENT ON COLUMN interacciones.indicadores_seleccionados_usuario IS 'Array de los indicadores que el usuario seleccionó o identificó como relevantes para su respuesta/justificación.';

CREATE TABLE EstadisticasDetalladasUsuario (
    estadistica_detalle_id BIGSERIAL PRIMARY KEY,
    sesion_id BIGINT NOT NULL REFERENCES sesiones(sesion_id) ON DELETE CASCADE,
    tipo_criterio VARCHAR(100) NOT NULL, -- Ej: 'TEMA_NOTICIA', 'DIFICULTAD_NOTICIA', 'TIPO_RAZONAMIENTO', 'INDICADOR_SELECCIONADO'
    valor_criterio TEXT NOT NULL,       -- Ej: 'Política', 'alto', 'Evaluación de fuentes', 'Fuente Fiable/Reconocida'
    numero_intentos INTEGER DEFAULT 0,
    numero_aciertos INTEGER DEFAULT 0,
    tasa_acierto FLOAT, -- Calculado como numero_aciertos / numero_intentos (si intentos > 0)
    fecha_ultima_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (sesion_id, tipo_criterio, valor_criterio)
);

-- Índices para la tabla EstadisticasDetalladasUsuario
CREATE INDEX IF NOT EXISTS idx_stats_detalle_usuario_criterio ON EstadisticasDetalladasUsuario (sesion_id, tipo_criterio);

-- Comentarios para la tabla EstadisticasDetalladasUsuario
COMMENT ON TABLE EstadisticasDetalladasUsuario IS 'Almacena estadísticas detalladas por usuario (sesion_id) y diversos criterios (tema, dificultad, tipo de razonamiento, indicador seleccionado por el usuario).';
COMMENT ON COLUMN EstadisticasDetalladasUsuario.tipo_criterio IS 'El tipo de criterio (ej: TEMA_NOTICIA, DIFICULTAD_NOTICIA, TIPO_RAZONAMIENTO, INDICADOR_SELECCIONADO).';
COMMENT ON COLUMN EstadisticasDetalladasUsuario.valor_criterio IS 'El valor específico del criterio (ej: Ciencia, alto, Identificación de sesgos, Titular Sensacionalista).';

CREATE TABLE eventos_uso (
    evento_id BIGSERIAL PRIMARY KEY,
    sesion_id BIGINT NOT NULL REFERENCES sesiones(sesion_id) ON DELETE CASCADE,
    evento_ts TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    funcionalidad_usada VARCHAR(255) NOT NULL, -- Ej. 'click_pedir_pista_general', 'consulta_glosario_termino_X'
    contexto TEXT -- Información adicional (ej. noticia_id_json sobre la que se pidió pista, término consultado)
);

-- Índices para la tabla eventos_uso
CREATE INDEX IF NOT EXISTS idx_eventos_uso_sesion_id ON eventos_uso (sesion_id);
CREATE INDEX IF NOT EXISTS idx_eventos_uso_funcionalidad ON eventos_uso (funcionalidad_usada);

COMMENT ON TABLE eventos_uso IS 'Registra eventos específicos de uso de funcionalidades de la aplicación por parte del usuario.';

CREATE TABLE IF NOT EXISTS ChatSesionesNoticia (
    chat_sesion_noticia_id BIGSERIAL PRIMARY KEY,
    sesion_id BIGINT NOT NULL REFERENCES sesiones(sesion_id) ON DELETE CASCADE,
    noticia_id_json VARCHAR(255) NOT NULL,
    fecha_inicio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    evaluacion_inicial_usuario VARCHAR(50) NULL, -- 'TRUE', 'FALSE', 'UNSURE'
    explicacion_inicial_usuario TEXT NOT NULL,
    noticia_verdad_real_json VARCHAR(50), -- Copiada del JSON por el backend
    evaluacion_inicial_correcta BOOLEAN NULL,
    fecha_fin TIMESTAMP WITH TIME ZONE NULL,
    indicadores_discutidos TEXT[] NULL, -- Llenado por análisis post-chat LLM
    conceptos_clave_discutidos TEXT[] NULL, -- Llenado por análisis post-chat LLM
    mejora_comprension_evaluacion VARCHAR(10) NULL CHECK (mejora_comprension_evaluacion IN ('SI', 'NO', 'INCIERTO')),
    mejora_comprension_justificacion TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_sesiones_usuario_v2 ON ChatSesionesNoticia(sesion_id);
CREATE INDEX IF NOT EXISTS idx_chat_sesiones_noticia_v2 ON ChatSesionesNoticia(noticia_id_json);

COMMENT ON TABLE ChatSesionesNoticia IS 'Registra cada sesión de análisis guiado por chatbot de una noticia por un usuario.';
COMMENT ON COLUMN ChatSesionesNoticia.evaluacion_inicial_usuario IS 'La clasificación inicial (Verdadera/Falsa/Indeciso) que el usuario pudo haber dado antes de explicar.';
COMMENT ON COLUMN ChatSesionesNoticia.noticia_verdad_real_json IS 'Veracidad real de la noticia, copiada del JSON por el backend para análisis posterior.';
COMMENT ON COLUMN ChatSesionesNoticia.evaluacion_inicial_correcta IS 'Si la evaluación inicial del usuario fue correcta.';
COMMENT ON COLUMN ChatSesionesNoticia.conceptos_clave_discutidos IS 'Array de conceptos o habilidades de pensamiento crítico que se abordaron durante el chat.';
COMMENT ON COLUMN ChatSesionesNoticia.indicadores_discutidos IS 'Array de indicadores de desinformación que fueron relevantes o discutidos en el chat.';
COMMENT ON COLUMN ChatSesionesNoticia.mejora_comprension_evaluacion IS 'Evaluación del LLM sobre si el usuario mejoró su comprensión (SI, NO, INCIERTO) tras el análisis post-chat.';
COMMENT ON COLUMN ChatSesionesNoticia.mejora_comprension_justificacion IS 'Justificación breve del LLM para la evaluación de mejora_comprension, tras el análisis post-chat.';

CREATE TABLE MensajesChatGuia (
    mensaje_guia_id BIGSERIAL PRIMARY KEY,
    chat_sesion_noticia_id BIGINT NOT NULL REFERENCES ChatSesionesNoticia(chat_sesion_noticia_id) ON DELETE CASCADE,
    emisor VARCHAR(50) NOT NULL CHECK (emisor IN ('usuario', 'chatbot')), -- Quién envió el mensaje
    contenido TEXT NOT NULL, -- El texto del mensaje
    timestamp_mensaje TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    orden_en_chat SERIAL NOT NULL -- Para asegurar el orden correcto de los mensajes dentro de una sesión de chat
    -- Podrías añadir un UNIQUE (chat_sesion_noticia_id, orden_en_chat) si `orden_en_chat` no fuera SERIAL y lo gestionaras manualmente.
    -- Si es SERIAL por tabla, necesitarías gestionarlo por grupo (chat_sesion_noticia_id) en la aplicación o con un trigger.
    -- Una mejor opción para 'orden_en_chat' sería un INTEGER que incrementas en la aplicación al guardar.
);

CREATE INDEX idx_mensajes_chat_sesion ON MensajesChatGuia(chat_sesion_noticia_id);

COMMENT ON TABLE MensajesChatGuia IS 'Almacena cada mensaje intercambiado durante una sesión de análisis guiado de noticia.';
COMMENT ON COLUMN MensajesChatGuia.orden_en_chat IS 'Número secuencial del mensaje dentro de su sesión de chat para reconstruir la conversación.';
-- =====================================================================
-- Fin del Script
-- =====================================================================
