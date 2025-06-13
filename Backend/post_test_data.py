import json
from typing import Dict, List, Any
# Asegúrate de que la ruta al import sea correcta desde donde ejecutes
from models.models import PostTestSubmitPayload

# ==============================================================================
# SECCIÓN 1: DEFINICIÓN DE PREGUNTAS Y NOTICIAS DEL POST-TEST
# ==============================================================================
post_test_questions: List[Dict[str, Any]] = [
    # Sección 1: ¿Cómo ves las noticias ahora?
    {
        "id_pregunta": "s1_p1", "seccion_id": "s1", "tipo": "eleccion_unica",
        "texto_pregunta": "¿Cómo dirías que se te da AHORA descubrir si una noticia que ves en internet o redes sociales es verdadera o es falsa? (marca SOLO UNA opción)",
        "opciones": [
            {"id": "s1_p1_o1", "text": "Nada bueno/a, me cuesta muchísimo."},
            {"id": "s1_p1_o2", "text": "No muy bueno/a, suelo dudar."},
            {"id": "s1_p1_o3", "text": "Normal, a veces acierto y a veces no."},
            {"id": "s1_p1_o4", "text": "Bastante bueno/a, suelo acertar."},
            {"id": "s1_p1_o5", "text": "¡Soy un crack!, se me da muy bien."}
        ]
    },
    {
        "id_pregunta": "s1_p2", "seccion_id": "s1", "tipo": "eleccion_unica",
        "texto_pregunta": "¿Cómo de difícil crees que es saber AHORA si una noticia es real hoy en día? (marca SOLO UNA opción)",
        "opciones": [
            {"id": "s1_p2_o1", "text": "Es muy fácil, casi nunca tengo dudas."},
            {"id": "s1_p2_o2", "text": "Es bastante fácil, aunque a veces dudo."},
            {"id": "s1_p2_o3", "text": "Ni fácil ni dificil, depende mucho de la noticia."},
            {"id": "s1_p2_o4", "text": "Bastante dificil, dudo a menudo."},
            {"id": "s1_p2_o5", "text": "Muy dificil, casi siempre dudo o no lo sé."}
        ]
    },
    {
        "id_pregunta": "s1_p3", "seccion_id": "s1", "tipo": "eleccion_multiple",
        "texto_pregunta": "Cuando ves una noticia y no estás seguro/a, ¿en qué cosas te sueles fijar AHORA? (puedes marcar TODAS las que apliquen)",
        "opciones": [
            {"id": "s1_p3_o1", "text": "Si la web o la persona que la publica parece de confianza."},
            {"id": "s1_p3_o2", "text": "Si el titular es muy exagerado o busca polémica."},
            {"id": "s1_p3_o3", "text": "Si está bien escrita, sin faltas de ortografía."},
            {"id": "s1_p3_o4", "text": "Si explica de dónde viene la información o da pruebas."},
            {"id": "s1_p3_o5", "text": "Si busco esa misma noticia o sobre quién la publica en otros sitios web para comparar."},
            {"id": "s1_p3_o6", "text": "Si tiene fotos o vídeos (me creo más las que tienen)."},
            {"id": "s1_p3_o7", "text": "Si la comparten mis amigos o mucha gente."},
            {"id": "s1_p3_o8", "text": "Si la fecha es reciente o antigua."},
            {"id": "s1_p3_o9", "text": "Si me hace sentir muy enfadado/a o sorprendido/a."},
            {"id": "s1_p3_o10", "text": "La verdad, no me suelo fijar mucho."}
        ]
    },
    {
        "id_pregunta": "s1_p4", "seccion_id": "s1", "tipo": "eleccion_multiple",
        "texto_pregunta": "¿Qué tipo de fuentes te hacen confiar más AHORA para ver que una noticia es VERDAD? (puedes marcar TODAS las que apliquen).",
        "opciones": [
            {"id": "s1_p4_o1", "text": "Periódicos, telediarios o webs de noticias famosas (El Mundo, El País, La Vanguardia...)."},
            {"id": "s1_p4_o2", "text": "Webs oficiales (del gobierno, de la NASA, de universidades...)."},
            {"id": "s1_p4_o3", "text": "Un científico o experto conocido que habla del tema."},
            {"id": "s1_p4_o4", "text": "Mis amigos o mi familia cuando me cuentan algo."},
            {"id": "s1_p4_o5", "text": "Un Youtuber o Tiktoker con muchos seguidores."},
            {"id": "s1_p4_o6", "text": "Cualquier web que parezca profesional, aunque no la conozca."},
            {"id": "s1_p4_o7", "text": "Mensajes que se reenvían mucho por WhatsApp."}
        ]
    },
    {
        "id_pregunta": "s1_p5", "seccion_id": "s1", "tipo": "eleccion_multiple",
        "texto_pregunta": "¿Qué cosas en una noticia te harían sospechar más AHORA que podría ser FALSA? (puedes marcar TODAS las que te hagan dudar)",
        "opciones": [
            {"id": "s1_p5_o1", "text": "Un titular súper exagerado o increíble."},
            {"id": "s1_p5_o2", "text": "Muchas faltas de ortografia o frases mal escritas."},
            {"id": "s1_p5_o3", "text": "Uso de muchas mayúsculas y signos de exclamación (!!!)"},
            {"id": "s1_p5_o4", "text": "Un lenguaje que busca enfadarte, darte miedo o insultar."},
            {"id": "s1_p5_o5", "text": "Que no diga de dónde saca la información o no dé pruebas."},
            {"id": "s1_p5_o6", "text": "Que te pida compartirla \"URGENTE\" con todo el mundo."},
            {"id": "s1_p5_o7", "text": "Que no tenga fecha o sea muy, muy antigua"},
            {"id": "s1_p5_o8", "text": "Que nadie más hable de esa noticia en otros sitios."}
        ]
    },
    {
        "id_pregunta": "s1_p6", "seccion_id": "s1", "tipo": "eleccion_multiple",
        "texto_pregunta": "Y al revés, ¿qué cosas te harían pensar que una noticia tiene más posibilidades de ser VERDAD? (puedes marcar TODAS las que te ayuden)",
        "opciones": [
            {"id": "s1_p6_o1", "text": "Si explica claramente de dónde viene la información y da enlaces o nombres."},
            {"id": "s1_p6_o2", "text": "Si la escriben expertos o periodistas conocidos."},
            {"id": "s1_p6_o3", "text": "Si varios periódicos o webs de noticias fiables cuentan lo mismo."},
            {"id": "s1_p6_o4", "text": "Si está escrita de forma tranquila y objetiva, sin insultar ni exagerar."},
            {"id": "s1_p6_o5", "text": "Si tiene una fecha clara y es reciente."},
            {"id": "s1_p6_o6", "text": "Si presenta datos o números concretos (y dice de dónde salen)."},
            {"id": "s1_p6_o7", "text": "Si encaja con cosas que ya sé que son verdad."}
        ]
    },
    { "id_pregunta": "s2_p7", "seccion_id": "s2", "tipo": "texto_libre", "texto_pregunta": "Después de usar el chatbot Pimpoyo, ¿qué es lo más importante que has aprendido sobre cómo detectar si una noticia es verdadera o falsa?" },
    { "id_pregunta": "s2_p8", "seccion_id": "s2", "tipo": "texto_libre", "texto_pregunta": "¿Ha cambiado tu forma de ver o de reaccionar ante las noticias que encuentras en internet desde que usaste a Pimpoyo? ¿podrías explicar cómo?" },
    {
        "id_pregunta": "s2_p9", "seccion_id": "s2", "tipo": "eleccion_unica",
        "texto_pregunta": "¿Sientes que aprendiste cosas nuevas sobre cómo detectar noticias falsas gracias a Pimpoyo?",
        "opciones": [
            {"id": "s2_p9_o1", "text": "Sí, aprendí muchísimo, ahora me siento mucho más preparado/a."},
            {"id": "s2_p9_o2", "text": "Sí, aprendí bastantes cosas útiles que antes no sabía."},
            {"id": "s2_p9_o3", "text": "Sí, aprendí algunas cosas nuevas, aunque ya sabía algo del tema."},
            {"id": "s2_p9_o4", "text": "No mucho, creo que ya conocía la mayoría de lo que Pimpoyo explicaba."},
            {"id": "s2_p9_o5", "text": "No, realmente no aprendí nada nuevo con Pimpoyo."}
        ]
    },
    {
        "id_pregunta": "s4_p12", "seccion_id": "s4", "tipo": "eleccion_unica",
        "texto_pregunta": "En una escala del 1 (muy difícil) al 5 (muy fácil), ¿cómo de fácil o difícil te resultó usar a Pimpoyo para chatear y hacer las actividades? (marca SOLO UNA opción)", # <-- ¡COMA AÑADIDA AQUÍ!
        "opciones": [
            {"id": "s4_p12_o5", "text": "5 - Muy fácil, entendí todo enseguida y no tuve problemas."},
            {"id": "s4_p12_o4", "text": "4 - Bastante fácil, aunque alguna vez dudé un poco, lo pude sacar sin problemas."},
            {"id": "s4_p12_o3", "text": "3 - Normal, ni muy fácil ni muy dificil, algunas cosas bien y otras regular."},
            {"id": "s4_p12_o2", "text": "2 - Un poco dificil, a veces me costaba saber qué hacer o entenderlo."},
            {"id": "s4_p12_o1", "text": "1 - Muy dificil, me pareció complicado y me perdía a menudo."}
        ]
    },
    {
        "id_pregunta": "s4_p13", "seccion_id": "s4", "tipo": "eleccion_unica",
        "texto_pregunta": "Cuando Pimpoyo te daba pistas o explicaciones, ¿cómo te parecieron esas ayudas?",
        "opciones": [
            {"id": "s4_p13_o5", "text": "Muy claras y súper útiles, me ayudaron un montón a entender."},
            {"id": "s4_p13_o4", "text": "Bastante claras y útiles, generalmente me servían para avanzar."},
            {"id": "s4_p13_o3", "text": "A veces eran claras y útiles, pero otras veces no tanto o me confundían un poco."},
            {"id": "s4_p13_o2", "text": "No muy claras o no muy útiles, pocas veces me ayudaron de verdad."},
            {"id": "s4_p13_o1", "text": "Nada claras ni útiles, sentí que no me aportaban nada."}
        ]
    },
    { "id_pregunta": "s4_p14_15", "seccion_id": "s4", "tipo": "texto_libre", "texto_pregunta": "¿Qué fue lo que más y lo que menos te gustó de interactuar con Pimpoyo y de hacer las actividades? (puedes contarnos sobre el personaje, las noticias, las explicaciones, lo que aprendiste, etc.)" },
    {
        "id_pregunta": "s4_p18", "seccion_id": "s4", "tipo": "eleccion_unica",
        "texto_pregunta": "¿Con qué frecuencia crees que intentarás aplicar los consejos o estrategias que aprendiste con Pimpoyo cuando veas noticias a partir de ahora?",
        "opciones": [
            {"id": "s4_p18_o5", "text": "Siempre, en todas las noticias que vea."},
            {"id": "s4_p18_o4", "text": "Casi siempre, en la mayoría de las noticias."},
            {"id": "s4_p18_o3", "text": "A veces, en algunas noticias si me acuerdo o me parecen dudosas."},
            {"id": "s4_p18_o2", "text": "Rara vez, solo si algo me llama mucho la atención."},
            {"id": "s4_p18_o1", "text": "Nunca, no creo que lo haga."}
        ]
    }
]

post_test_news: List[Dict[str, str]] = [
    {
        "noticia_id_json": "post_test_apagon_falsa",
        "headline": "¡LO OCULTAN! APAGÓN MASIVO NO FUE CASUALIDAD: Expertos independientes denuncian posible CIBERATAQUE COORDINADO.",
        "text": "Mientras las autoridades ofrecen explicaciones técnicas sobre \"fallos en cadena\" para el gran apagón que afectó a la península el pasado 28 de abril, crece la preocupación entre círculos de expertos en ciberseguridad que apuntan a una causa mucho más siniestra. Un informe filtrado, elaborado por un grupo de ingenieros eléctricos de internet piensa que la historia podría ser diferente y mucho más siniestra. Ellos aseguran tener pruebas contundentes de una invasión externa coordinada en los sistemas de control de la red eléctrica nacional. El informe que se hace eco en los foros especializados dice: \"Esto no fue un simple fallo, fue una prueba. Alguien atacó los ordenadores especiales (llamados SCADA) que controlan que la luz llegue bien a todas las casas y ciudades\". También informa que el ataque pudo ser obra de otro país con el objetivo de probar cómo de bien se defiende España ante un ataque por internet y ver si estamos preparados para una \"guerra moderna\". El informe recomienda a la gente no creerse la historia del \"fallo técnico\" y estar preparados por si hay nuevos apagones más serios en el futuro. Las compañías eléctricas y el Centro Criptológico Nacional, por el momento, han mantenido silencio sobre estas alegaciones específicas, limitándose a difundir los comunicados sobre fallos técnicos.",
        "source": "\"informe filtrado\" distribuido por canales de mensajería encriptada y foros de ciberseguridad alternativos - Abril 2025",
        "respuesta_correcta": "Falso"
    }
]

# ==============================================================================
# SECCIÓN 2: LÓGICA DE PUNTUACIÓN (ACTUALIZADA CON PERFILES DE TEXTO)
# ==============================================================================

puntos_config = {
    "s1": {
        "max_puntos": 54.0,
        "respuestas_correctas": {
            # --- PREGUNTAS DE PERFIL (NO PUNTÚAN) ---
            "s1_p1": {
                "s1_p1_o1": "Baja Autopercepción de Competencia",
                "s1_p1_o2": "Baja Autopercepción de Competencia",
                "s1_p1_o3": "Autopercepción de Competencia Media",
                "s1_p1_o4": "Alta Autopercepción de Competencia",
                "s1_p1_o5": "Alta Autopercepción de Competencia"
            },
            "s1_p2": {
                "s1_p2_o1": "Baja Percepción de Dificultad",
                "s1_p2_o2": "Baja Percepción de Dificultad",
                "s1_p2_o3": "Percepción Media de Dificultad",
                "s1_p2_o4": "Alta Percepción de Dificultad",
                "s1_p2_o5": "Alta Percepción de Dificultad"
            },

            # --- PREGUNTAS QUE SÍ PUNTÚAN ---
            "s1_p3": {"s1_p3_o1": 2, "s1_p3_o2": 2, "s1_p3_o3": 1, "s1_p3_o4": 3, "s1_p3_o5": 2, "s1_p3_o8": 1},
            "s1_p4": {"s1_p4_o1": 5.5, "s1_p4_o2": 5.5, "s1_p4_o3": 5},
            "s1_p5": {"s1_p5_o1": 2, "s1_p5_o2": 2, "s1_p5_o3": 2, "s1_p5_o4": 2, "s1_p5_o5": 1, "s1_p5_o6": 3, "s1_p5_o7": 2, "s1_p5_o8": 2},
            "s1_p6": {"s1_p6_o1": 3, "s1_p6_o2": 2, "s1_p6_o3": 1.5, "s1_p6_o4": 1.5, "s1_p6_o5": 1.5, "s1_p6_o6": 1.5},
        }
    },
    "s2": {
        "max_puntos": 5.0,
        "respuestas_correctas": {
            "s2_p9": {"s2_p9_o1": 5, "s2_p9_o2": 4, "s2_p9_o3": 3, "s2_p9_o4": 2, "s2_p9_o5": 1}
        }
    },
    "s3": {
        "max_puntos": 26.0,
        "respuestas_correctas": {
            "post_test_apagon_falsa": {"evaluacion": "Falso", "puntos": 6}
        }
    },
    "s4": {
        "max_puntos": 15.0,
        "respuestas_correctas": {
            "s4_p12": {"s4_p12_o5": 5, "s4_p12_o4": 4, "s4_p12_o3": 3, "s4_p12_o2": 2, "s4_p12_o1": 1},
            "s4_p13": {"s4_p13_o5": 5, "s4_p13_o4": 4, "s4_p13_o3": 3, "s4_p13_o2": 2, "s4_p13_o1": 1},
            "s4_p18": {"s4_p18_o5": 5, "s4_p18_o4": 4, "s4_p18_o3": 3, "s4_p18_o2": 2, "s4_p18_o1": 1},
        }
    }
}

def score_post_test(payload: PostTestSubmitPayload) -> Dict[str, Any]:
    puntuaciones = {"s1": 0.0, "s2": 0.0, "s3": 0.0, "s4": 0.0}

    for resp in payload.respuestas_eleccion:
        seccion = resp.id_pregunta.split('_')[0]
        if seccion in puntos_config and resp.id_pregunta in puntos_config[seccion].get("respuestas_correctas", {}):
            config_pregunta = puntos_config[seccion]["respuestas_correctas"][resp.id_pregunta]
            for opcion_id in resp.respuestas_seleccionadas:
                if opcion_id in config_pregunta:
                    puntos = config_pregunta[opcion_id]
                    if isinstance(puntos, (int, float)):
                        puntuaciones[seccion] += puntos

    for resp in payload.respuestas_analisis:
        if resp.noticia_id_json in puntos_config["s3"]["respuestas_correctas"]:
            config_noticia = puntos_config["s3"]["respuestas_correctas"][resp.noticia_id_json]
            if resp.evaluacion_usuario == config_noticia["evaluacion"]:
                puntuaciones["s3"] += config_noticia["puntos"]

    for seccion_id, puntos in puntuaciones.items():
        max_p = puntos_config[seccion_id]['max_puntos']
        puntuaciones[seccion_id] = max(0, min(puntos, max_p))

    puntuacion_total = sum(puntuaciones.values())
    puntuacion_maxima_posible = sum(config["max_puntos"] for config in puntos_config.values())

    return {
        "puntuacion_total": round(puntuacion_total, 2),
        "puntuacion_maxima_posible": round(puntuacion_maxima_posible, 2),
        "puntuaciones_por_seccion": [
            {"seccion_id": "s1", "puntos_obtenidos": round(puntuaciones["s1"], 2), "puntos_maximos": puntos_config["s1"]["max_puntos"]},
            {"seccion_id": "s2", "puntos_obtenidos": round(puntuaciones["s2"], 2), "puntos_maximos": puntos_config["s2"]["max_puntos"]},
            {"seccion_id": "s3", "puntos_obtenidos": round(puntuaciones["s3"], 2), "puntos_maximos": puntos_config["s3"]["max_puntos"]},
            {"seccion_id": "s4", "puntos_obtenidos": round(puntuaciones["s4"], 2), "puntos_maximos": puntos_config["s4"]["max_puntos"]},
        ]
    }
