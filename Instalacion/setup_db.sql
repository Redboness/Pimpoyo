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
    inicio_sesion_ts TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    edad INTEGER NOT NULL,
    genero VARCHAR(50),
    curso_escolar VARCHAR(100),
    consentimiento_obtenido BOOLEAN NOT NULL,
    puntuacion_pre_test FLOAT,
    fin_sesion_ts TIMESTAMP WITH TIME ZONE,
    duracion_total_sesion_seg INTEGER,
    puntuacion_final FLOAT,
    interacciones_totales_sesion INTEGER DEFAULT 0,
    precision_global_sesion FLOAT,
    puntuacion_post_test FLOAT,
    -- Columnas añadidas directamente aquí:
    hashed_password VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(512) NULL
);

-- Comentarios para la tabla sesiones (incluyendo los nuevos)
COMMENT ON COLUMN sesiones.sesion_id IS 'ID numérico único y auto-incremental para la sesión (BIGSERIAL)';
COMMENT ON COLUMN sesiones.apodo IS 'Nickname proporcionado por el usuario para esta sesión';
COMMENT ON COLUMN sesiones.inicio_sesion_ts IS 'Timestamp exacto del inicio de la sesión';
COMMENT ON COLUMN sesiones.edad IS 'Edad del niño participante';
COMMENT ON COLUMN sesiones.genero IS 'Género del participante (ej. Niño, Niña, Otro, Prefiero no decirlo)';
COMMENT ON COLUMN sesiones.curso_escolar IS 'Curso escolar (ej. 5º Primaria, 6º Primaria)';
COMMENT ON COLUMN sesiones.consentimiento_obtenido IS 'Booleano (True/False) confirmando el consentimiento parental/tutor';
COMMENT ON COLUMN sesiones.puntuacion_pre_test IS 'Puntuación obtenida en una evaluación previa al uso, si se realiza';
COMMENT ON COLUMN sesiones.fin_sesion_ts IS 'Timestamp exacto de la finalización de la sesión';
COMMENT ON COLUMN sesiones.duracion_total_sesion_seg IS 'Duración total de la sesión en segundos (calculada al final)';
COMMENT ON COLUMN sesiones.puntuacion_final IS 'Puntuación total acumulada al finalizar la sesión';
COMMENT ON COLUMN sesiones.interacciones_totales_sesion IS 'Número total de noticias evaluadas en la sesión';
COMMENT ON COLUMN sesiones.precision_global_sesion IS 'Porcentaje de aciertos global en la sesión (calculado al final)';
COMMENT ON COLUMN sesiones.puntuacion_post_test IS 'Puntuación obtenida en una evaluación posterior al uso, si se realiza';
COMMENT ON COLUMN sesiones.hashed_password IS 'Hash seguro de la contraseña del usuario';
COMMENT ON COLUMN sesiones.avatar_url IS 'URL del avatar seleccionado por el usuario';


-- Tabla para los Detalles de Interacción (Sección B)
CREATE TABLE interacciones (
    interaccion_id BIGSERIAL PRIMARY KEY,
    sesion_id BIGINT NOT NULL,
    interaccion_ts TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    noticia_id VARCHAR(255) NOT NULL,
    noticia_fuente VARCHAR(255),
    noticia_verdad_real VARCHAR(50) NOT NULL,
    noticia_tema VARCHAR(100),
    noticia_dificultad VARCHAR(50),
    respuesta_usuario VARCHAR(50) NOT NULL,
    es_correcto BOOLEAN NOT NULL,
    tiempo_respuesta_ms INTEGER,
    puntos_otorgados INTEGER DEFAULT 0,
    tipo_error VARCHAR(100),
    feedback_mostrado TEXT,
    secuencia_interaccion INTEGER NOT NULL,
    criterios_evaluacion_ids JSONB,

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

-- Permisos para el usuario laydatfm
GRANT USAGE ON SCHEMA public TO laydatfm;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE sesiones TO laydatfm;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE interacciones TO laydatfm;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE eventos_uso TO laydatfm;

GRANT USAGE, SELECT ON SEQUENCE sesiones_sesion_id_seq TO laydatfm;
GRANT USAGE, SELECT ON SEQUENCE interacciones_interaccion_id_seq TO laydatfm;
GRANT USAGE, SELECT ON SEQUENCE eventos_uso_evento_id_seq TO laydatfm;

-- =====================================================================
-- Fin del Script
-- =====================================================================
