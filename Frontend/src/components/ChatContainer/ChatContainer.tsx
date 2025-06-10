/* eslint-disable prefer-const */
// src/components/ChatContainer/ChatContainer.tsx
import React, { useState, useEffect, useCallback } from "react";
import MessageList from "../MessageList/MessageList";
import ChatHeader from "../ChatHeader/ChatHeader";
import ChatInput from "../ChatInput/ChatInput";
import SidePanel from "../SidePanel/SidePanel";
import PostTestFlow from '../PostTestFlow/PostTestFlow';
import {
  UserInfo,
  ChatMessage,
  MessageButton,
  OllamaMessage,
  NewsItem,
  NewsChallengeState,
  DifficultyLevel,
  difficultyOrder,
  NoticiaParaAnalisis,
  ExplicacionInicialPayload,
  ChatGuiaResponse,
  ContinuarChatGuiaPayload,
  FinishPairChallengePayload,
  FinishPairChallengeResponse,
  TipChallengeCard
} from "../../types/types";
import { faArrowLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { processTextForGlossary } from "../Utils/glossaryUtils"; // Asumiendo que si lo renombraste a .tsx, la importación se resuelve bien.

interface ChatContainerProps {
  authToken: string;
  onLogout: () => void;
}

const BOT_AVATAR_URL = "https://i.postimg.cc/GpMfkzPx/Rat-n-profesor-Copy.png";
const USER_AVATAR_URL_DEFAULT = "https://i.postimg.cc/SQwcn892/Ni-o-avatar-copy.png";

// Interfaces LOCALES para la estructura interna de 'tips'
interface TipChallengeOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface TipChallenge {
  question: string;
  options?: TipChallengeOption[];
  feedbackCorrect: string;
  feedbackIncorrect: string;
}

interface Tip {
  title: string;
  text: string;
  challenge?: TipChallenge;
}

const tips: Tip[] = [
  {
    title: "**CONSEJO 1: ¿QUIÉN LO DICE? 🕵️‍♀️**",
    text: "Imagina que la [[Fuente (de información)|fuente]] de una noticia es como la persona que te cuenta un secreto. ¿Confiarías en cualquiera?\n\nPor eso, **fíjate siempre en** ¿quién publica la noticia? Pregúntate: ¿Es un periódico conocido como El País o El Mundo, una cadena de televisión como RTVE, o una agencia internacional [[Fiable|fiable]] como BBC News o Euronews? Cuando Pimpoyo y tú analicéis una noticia, él te ayudará a ver si su fuente es de este tipo.\n\n**¡Importante!** Si la fuente es una web que no conoces, te parece extraña, o es un blog personal sin referencias claras, ¡investiga un poco sobre ella antes de creer la noticia! Una fuente desconocida es una señal de alerta.",
    challenge: {
      question: "*Pimpoyo te reta:* Si ves una noticia en \"SuperNoticiasFiables.com\" y otra en la web oficial de \"RTVE Noticias\", ¿cuál te parece más fiable a primera vista?",
      options: [ { id: "c1_opt1", text: "SuperNoticiasFiables punto com", isCorrect: false }, { id: "c1_opt2", text: "RTVE Noticias", isCorrect: true }, { id: "c1_opt3", text: "Las dos igual", isCorrect: false }, ],
      feedbackCorrect: "¡Exacto! RTVE Noticias es una fuente conocida y establecida, lo que la hace más fiable a primera vista. De la otra web, como no la conocemos mucho y su nombre suena un poco exagerado, haríamos bien en investigar más antes de confiar. ¡Bien visto!",
      feedbackIncorrect: "Es una buena idea fijarse en los nombres. \"SuperNoticiasFiables punto com\" suena muy convincente, ¿verdad? Pero a veces, los sitios menos conocidos pueden no ser tan fiables como las cadenas de noticias establecidas como RTVE, que tienen equipos de periodistas. ¡Es bueno dudar un poquito de las fuentes que no conocemos bien!"
    }
  },
  {
    title: "**CONSEJO 2: ¡COMPARA, COMPARA! 🆚**",
    text: "No te quedes solo con una versión de la historia, ¡como si solo escucharas a un amigo en una discusión!\n\nPor eso, **es clave que te fijes en esto:** [[Verificar|verifica]] la noticia buscando si otros medios conocidos y fiables también la cuentan. Por ejemplo, puedes [[Contrastar|contrastar]] lo que lees con lo que publican periódicos importantes de España, cadenas de televisión públicas, o fuentes de noticias internacionales reconocidas, como las que mencionamos en el primer consejo.\n\n**¡Importante!** Si muchos medios serios y diferentes cuentan la misma historia, es más probable que sea cierta. Pero si solo la encuentras en un sitio poco conocido o en blogs sin referencias claras, ¡es una gran pista para dudar! Podría ser un [[Bulo|bulo]].",
    challenge: {
      question: "*Pimpoyo te reta:* Si lees una noticia sorprendente sobre tu juego favorito solo en un pequeño blog que nadie conoce, ¿qué sería lo primero que harías según este consejo?",
      options: [ { id: "c2_opt1", text: "Creérmela y compartirla rápido", isCorrect: false }, { id: "c2_opt2", text: "Buscarla en otros sitios de noticias más grandes", isCorrect: true }, { id: "c2_opt3", text: "No hacer nada, seguro es mentira", isCorrect: false }, ],
      feedbackCorrect: "¡Muy bien! Lo primero sería buscar si otros sitios de noticias más grandes y conocidos también hablan de ello. Si no encuentras nada más, es una buena razón para sospechar que quizás no sea del todo cierta. ¡Esa es una gran estrategia de detective!",
      feedbackIncorrect: "Compartirla rápido puede ser tentador si la noticia es emocionante, ¡lo entiendo! Pero recuerda este consejo: si solo la has visto en un sitio pequeño y desconocido, es mejor buscarla primero en otros medios más grandes y fiables. Así te aseguras de no difundir un bulo."
    }
  },
  {
    title: "**CONSEJO 3: ¡OJO A LA FECHA! 📅**",
    text: "Las noticias son como el pan, ¡mejor si son frescas y del día! Cuando analices una noticia con Pimpoyo, él podría preguntarte por la fecha.\n\nAsí que, **fíjate bien en** la fecha en la que se publicó.\n\n**¡Importante!** A veces, noticias muy antiguas (¡incluso de hace años!) se comparten como si fueran nuevas para engañar o crear confusión. Esto es una táctica común de las [[Noticia falsa|noticias falsas]]. Sacar algo de [[Contexto|contexto]] es muy habitual. ¡Que no te den gato por liebre!",
    challenge: {
      question: "*Pimpoyo te reta:* Si un amigo te manda una noticia increíble sobre un descubrimiento espacial, pero ves que la fecha es de hace 5 años, ¿qué pensarías?",
      options: [ { id: "c3_opt1", text: "¡Qué guay! Sigue siendo un gran descubrimiento.", isCorrect: false }, { id: "c3_opt2", text: "Que es vieja y quizás ya no es tan 'noticia'.", isCorrect: true }, { id: "c3_opt3", text: "Que seguro es falsa porque es antigua.", isCorrect: false }, ],
      feedbackCorrect: "¡Exacto! Pensarías que, aunque pudo ser verdad en su momento, quizás ya no es una \"novedad\" o la situación ha cambiado. Las noticias viejas a veces se sacan de contexto. ¡Buen trabajo fijándote en la fecha!",
      feedbackIncorrect: "Es verdad que un descubrimiento puede seguir siendo interesante, ¡pero la fecha es una pista muy importante! Una noticia de hace 5 años podría no contar toda la historia actual o usarse para confundir. Siempre es bueno preguntarse si una noticia tan antigua sigue siendo relevante hoy."
    }
  },
  {
    title: "**CONSEJO 4: TITULARES CON TRAMPA 🎣**",
    text: "Algunos [[Titular|titulares]] son como un cebo brillante para pescar tu atención: ¡muy exagerados, alarmistas o sorprendentes! Pimpoyo a veces te preguntará: \"¿El titular parece muy exagerado?\".\n\nEntonces, **fíjate bien:** ¿El titular es demasiado increíble para ser verdad o busca generar una emoción muy fuerte? Lee siempre la noticia entera, no solo el titular, y pregúntate: ¿El texto cuenta lo mismo que el titular o lo exagera mucho?\n\n**¡Importante!** Esto se llama [[Clickbait|clickbait]]. Muchas veces, estos titulares esconden [[Fake news|noticias falsas]] o de poca calidad. Quieren tu clic, no informarte bien.",
    challenge: {
      question: "*Pimpoyo te reta:* ¿Cuál de estos titulares te parece más 'clickbait'?\nA) \"Descubren nueva especie de mariposa en el Amazonas\"\nB) \"¡ALUCINANTE! ¡CIENTÍFICOS CREAN MARIPOSA GIGANTE QUE HABLA! (NO TE LO CREERÁS)\"",
      options: [ { id: "c4_opt1", text: "El titular A", isCorrect: false }, { id: "c4_opt2", text: "El titular B", isCorrect: true }, ],
      feedbackCorrect: "¡Correcto! El titular B es súper exagerado, usa mayúsculas y frases como \"NO TE LO CREERÁS\" para llamar mucho la atención. Eso es típico del clickbait. El titular A, en cambio, suena más informativo y calmado. ¡Bien detectado!",
      feedbackIncorrect: "El titular A suena interesante, ¿verdad? Pero fíjate en el B: las mayúsculas, los signos de exclamación, y que diga \"NO TE LO CREERÁS\" son pistas de que intenta ser muy llamativo, ¡quizás demasiado! Eso es el 'clickbait'. Busca más el clic que informar con seriedad."
    }
  },
  {
    title: "**CONSEJO 5: ¿ESTÁ BIEN ESCRITO? ✍️**",
    text: "Las noticias de verdad suelen estar escritas con cuidado, ¡como un buen libro!\n\nPor eso, **fíjate en detalles como:** ¿Hay muchas faltas de ortografía? ¿Las frases están mal construidas o no se entienden bien, como a veces ves en mensajes [[Viral|virales]]? ¿Usa TODO EN MAYÚSCULAS y muchísimos signos de exclamación (!!!)?\n\n**¡Importante!** Los errores pueden ser una pista de que la noticia no es profesional y podría ser falsa. Un lenguaje muy agresivo o que solo busca la [[Manipulación|manipulación]] emocional también es sospechoso.",
    challenge: {
      question: "*Pimpoyo te reta:* Si lees: \"URGENTE!!! an descubierto un tesoro SECRETISIMO!!!!! comparte YA\", ¿es una señal de noticia fiable o sospechosa?",
      options: [ { id: "c5_opt1", text: "Fiable, porque es urgente", isCorrect: false }, { id: "c5_opt2", text: "Sospechosa, por los errores y mayúsculas", isCorrect: true }, ],
      feedbackCorrect: "¡Perfecto! Las mayúsculas excesivas, las faltas de ortografía como \"an descubierto\" o \"secretisimo\", y el pedir compartirlo urgentemente son señales clarísimas para desconfiar. Una noticia seria no se escribiría así. ¡Eres un gran observador!",
      feedbackIncorrect: "A veces, cuando algo es \"urgente\" queremos creerlo rápido. Pero fíjate bien: ¿una noticia importante se escribiría con tantas faltas como \"an descubierto\" o usaría tantas mayúsculas y exclamaciones? Esas son pistas de que quizás no es muy profesional y por eso es sospechosa."
    }
  },
  {
    title: "**CONSEJO 6: ¿PRUEBAS O SOLO PALABRAS? 🔍**",
    text: "Una noticia fiable te muestra de dónde saca la información, ¡como un detective que enseña sus pistas!\n\nPor eso, **fíjate si** la noticia menciona fuentes claras y verificables (por ejemplo, si nombra un estudio científico conocido, un informe oficial o a expertos específicos) y si ofrece enlaces o datos concretos para que puedas comprobarlo tú mismo.\n\n**¡Importante!** Si la noticia solo da [[Opinión|opiniones]], no dice de dónde viene la información claramente, o se basa en frases como \"me han dicho que...\" o \"se comenta por ahí\" sin más detalle, ¡desconfía! La falta de [[Evidencia|evidencia]] clara es una gran señal de alerta.",
    challenge: {
      question: "*Pimpoyo te reta:* Una noticia dice: \"Los expertos aseguran que comer chocolate te hace volar\". Para que sea más creíble, ¿qué debería incluir?",
      options: [ { id: "c6_opt1", text: "Quiénes son los expertos y dónde está el estudio", isCorrect: true }, { id: "c6_opt2", text: "Más opiniones de gente que ha volado", isCorrect: false }, { id: "c6_opt3", text: "Una foto de alguien volando tras comer chocolate", isCorrect: false }, ],
      feedbackCorrect: "¡Justo eso! Le faltaría saber QUIÉNES son esos \"expertos\", si hay algún estudio científico que lo demuestre, o dónde podemos leer más sobre ese \"descubrimiento\". Sin esas pruebas, ¡suena más a fantasía que a noticia!",
      feedbackIncorrect: "Una foto o más opiniones podrían ser llamativas, ¡pero lo más importante son las pruebas! Para que sea creíble, necesitamos saber quiénes son esos expertos y dónde está el estudio que lo demuestra. ¡Las pruebas son clave, no solo lo que la gente dice o muestra sin más!"
    }
  },
  {
    title: "**CONSEJO 7: ¿HISTORIA COMPLETA O A MEDIAS? 🧐**",
    text: "A veces, una noticia puede estar un poquito inclinada hacia un lado, como una torre que no está recta, mostrando solo una parte de la historia.\n\nPor eso, **intenta descubrir si** la noticia cuenta diferentes puntos de vista o solo se enfoca en uno, ignorando los demás.\n\n**¡Importante!** Cuando una noticia parece favorecer mucho una idea y no presenta otros argumentos, podría tener [[Sesgo|sesgo]]. Un buen detective busca la historia más completa posible.",
    challenge: {
      question: "*Pimpoyo te reta:* Si una noticia sobre un nuevo videojuego solo entrevista a gente que dice que es lo peor del mundo, ¿qué te faltaría para tener una idea más clara?",
      options: [ { id: "c7_opt1", text: "Saber por qué es tan malo", isCorrect: false }, { id: "c7_opt2", text: "Escuchar a gente a la que sí le gusta", isCorrect: true }, { id: "c7_opt3", text: "Ver más vídeos del juego", isCorrect: false }, ],
      feedbackCorrect: "¡Tienes toda la razón! Parece que solo nos está mostrando una parte de la historia, la negativa. Para entenderlo bien, sería importante escuchar también a quienes sí les gusta o buscar otras opiniones. Así tendríamos una visión más completa y justa.",
      feedbackIncorrect: "Saber por qué es malo o ver vídeos ayuda, pero para saber si la noticia te cuenta la historia completa, es clave buscar los puntos de vista que faltan. Si solo nos dan una opinión, ¡quizás nos están mostrando solo un lado de la moneda! Faltaría la opinión de a quiénes sí les gusta, por ejemplo."
    }
  },
  {
    title: "**CONSEJO 8: ¡CUIDADO CON LAS EMOCIONES FUERTES! 😲😠😂**",
    text: "Las noticias que nos hacen sentir MUY enfadados, tristes o súper felices al instante, a veces son como un mago que distrae tu atención.\n\nAsí que, **pon atención si** una noticia te provoca una emoción muy fuerte de golpe. Pregúntate: ¿Esta noticia busca más emocionarte que hacerte pensar con calma?\n\n**¡Importante!** Algunas noticias falsas usan emociones intensas para que no te pares a pensar si son verdad o no y para que las compartas rápido. ¡Respira hondo y analiza antes de creértela!",
    challenge: {
      question: "*Pimpoyo te reta:* Si lees un titular que te hace enfadar muchísimo al instante, ¿qué es bueno hacer antes de compartirlo o creértelo del todo?",
      options: [ { id: "c8_opt1", text: "Compartirlo rápido para que todos se enfaden", isCorrect: false }, { id: "c8_opt2", text: "Respirar y pensar si busca enfadarme a propósito", isCorrect: true }, { id: "c8_opt3", text: "Buscar más noticias que me hagan enfadar", isCorrect: false }, ],
      feedbackCorrect: "¡Excelente! Lo mejor es parar un segundo, respirar y pensar si la noticia podría estar intentando que te enfades a propósito para que no analices bien la información. Usar las emociones para que no pensemos es un truco de algunas noticias falsas.",
      feedbackIncorrect: "Cuando algo nos enfada mucho, la primera reacción puede ser compartirlo para que otros también se enteren. ¡Pero cuidado! A veces, las noticias falsas buscan justo eso, que la emoción nos gane y no pensemos con calma. ¡Es mejor respirar y analizarla un poquito antes de compartir!"
    }
  },
  {
    title: "**CONSEJO 9: ¿A QUIÉN LE INTERESA? 🤔**",
    text: "Detrás de cada noticia, puede haber alguien que quiere que pienses o hagas algo específico.\n\nPor eso, **una buena pregunta de detective es:** ¿Quién podría querer que yo me crea esta noticia y por qué? ¿Gana algo alguien si esta historia se difunde?\n\n**¡Importante!** Pensar en quién se beneficia te puede dar pistas sobre si la noticia es de confianza o si intenta convencerte de algo sin que te des cuenta. A veces, esto es parte de la [[Propaganda|propaganda]] o la manipulación.",
    challenge: {
      question: "*Pimpoyo te reta:* Si ves un anuncio muy divertido que dice que una nueva marca de zapatillas te hará correr más rápido que nadie, ¿quién crees que se beneficia más si te lo crees?",
      options: [ { id: "c9_opt1", text: "Yo, porque correré más rápido", isCorrect: false }, { id: "c9_opt2", text: "La marca de zapatillas", isCorrect: true }, { id: "c9_opt3", text: "Mis amigos, que me verán correr", isCorrect: false }, ],
      feedbackCorrect: "¡Clarísimo! La marca de zapatillas, porque así es más probable que quieras comprarlas. Preguntarse quién se beneficia nos ayuda a ver si la información es objetiva o si tiene una intención detrás. ¡Muy astuto!",
      feedbackIncorrect: "¡Es verdad que tú te beneficiarías si corrieras más rápido! Pero piensa, ¿quién más quiere que te lo creas mucho, mucho? La empresa que vende las zapatillas, ¿verdad? Ellos ganarían dinero si las compras. A veces, la intención detrás de un mensaje es importante para saber si es del todo neutral."
    }
  }
];

const defaultGlossaryTermsForChatContainer = [
  { term: "Algoritmo", definition: "Son como recetas secretas que usan las apps y webs (¡como TikTok o YouTube!). Siguen unos pasos ordenados para decidir qué vídeos mostrarte, qué amigos sugerirte o qué anuncios poner. ¡Intentan aprender lo que te gusta!", isDefault: true },
  { term: "Bulo", definition: "Es una mentira disfrazada de noticia que alguien inventa y comparte para engañar, gastar una broma pesada o incluso para intentar hacer daño. ¡Hay que estar atentos para no caer en ellos!", isDefault: true },
  { term: "Cámara de Eco", definition: "A veces, en internet o en las redes sociales, los algoritmos nos muestran solo noticias e ideas que ya nos gustan o con las que estamos de acuerdo. Esto crea como una 'burbuja' donde no vemos otras opiniones y parece que todo el mundo piensa igual que nosotros.", isDefault: true },
  { term: "Clickbait", definition: "Son esos titulares o imágenes súper exagerados y curiosos que ves en internet y que te hacen pinchar casi sin pensar (¡clic!). A veces, la noticia que encuentras después no es tan emocionante o incluso es un poco engañosa. ¡Solo querían tu clic!", isDefault: true },
  { term: "Contrastar", definition: "Imagina que un amigo te cuenta algo sorprendente. Para saber si es del todo cierto, ¿a que le preguntarías a otros amigos también? Contrastar es hacer eso con las noticias: buscar la misma información en diferentes sitios (periódicos, webs, teles...) para ver si todos cuentan lo mismo o si hay pistas diferentes. ¡Es como ser un detective que junta varias piezas!", isDefault: true },
  { term: "Contexto", definition: "Es como el escenario completo de una película. Para entender bien una noticia, necesitas saber no solo *qué* pasó, sino también *cuándo* pasó, *dónde*, *quiénes* estaban allí y *qué más* importante estaba ocurriendo al mismo tiempo. ¡Una foto o una frase sacada de contexto puede engañar mucho!", isDefault: true },
  { term: "Deepfake", definition: "¡Es como magia de ordenador muy avanzada! Usan inteligencia artificial para crear vídeos o audios falsos que parecen súper reales, donde una persona famosa (¡o cualquiera!) dice o hace cosas que nunca hizo de verdad. ¡Pueden ser muy difíciles de pillar!", isDefault: true },
  { term: "Desinformación", definition: "Es información que es mentira y que alguien la crea y la comparte *a propósito* para engañar, confundir o hacer que la gente crea algo que no es cierto. No es un simple error, ¡hay intención detrás!", isDefault: true },
  { term: "Evidencia", definition: "Son las pistas que te ayudan a saber si algo es verdad. Pueden ser números, fotos que no estén trucadas, documentos oficiales, o lo que dice un verdadero experto en un tema. ¡Como un detective, Pimpoyo siempre busca la evidencia!", isDefault: true },
  { term: "Fake news", definition: "Es otra forma de llamar a las noticias que son mentira. Se escriben y se comparten a propósito para que la gente crea cosas que no son ciertas, a veces para confundir o para que alguien piense de una manera determinada.", isDefault: true },
  { term: "Fiable", definition: "Cuando decimos que una fuente de noticias (como un periódico o una web) es 'fiable', significa que podemos confiar bastante en que la información que nos da es verdadera y ha sido bien investigada. Es como un amigo que sabes que casi siempre te cuenta las cosas como son.", isDefault: true },
  { term: "Fuente (de información)", definition: "Es de dónde viene la noticia, ¡como saber quién te contó un chisme! Puede ser un periódico, una página web, un canal de tele, un experto o incluso un amigo. Siempre hay que preguntarse: ¿quién lo dice? ¿Y puedo confiar en esa fuente?", isDefault: true },
  { term: "Hecho", definition: "Es algo que se puede demostrar que es verdad o que realmente ocurrió. Por ejemplo, 'Madrid es la capital de España' es un hecho. No depende de si te gusta o no, ¡simplemente es así!", isDefault: true },
  { term: "Imagen Manipulada", definition: "Es una foto o un dibujo que alguien ha cambiado con el ordenador para que parezca de verdad, pero en realidad está trucada. Puede ser para quitar a alguien, añadir algo que no estaba, o hacer que parezca que pasó algo que no es cierto. ¡Ojo, que no todo lo que brilla es oro!", isDefault: true },
  { term: "Manipulación", definition: "Es cuando alguien intenta cambiar la forma en que piensas o sientes sobre algo, usando información de manera tramposa. Puede ser mostrando solo una parte de la historia, exagerando mucho o inventando cosas para llevarte a una conclusión que a esa persona le interesa.", isDefault: true },
  { term: "Noticia Falsa", definition: "Es simplemente una noticia que no es verdad. Alguien la inventó o se equivocó mucho, pero la presentan como si fuera real.", isDefault: true },
  { term: "Opinión", definition: "Es lo que una persona piensa, siente o cree sobre algo. Por ejemplo, decir 'el color azul es el más bonito' es una opinión. No se puede demostrar si es verdadera o falsa, ¡porque es el gusto de cada uno! Es diferente a un hecho.", isDefault: true },
  { term: "Propaganda", definition: "Es información que se presenta de una forma especial para intentar convencerte de que apoyes una idea, un producto o a un grupo de personas (como un partido político). A veces usa verdades, pero otras exagera mucho o esconde partes de la historia para lograr su objetivo.", isDefault: true },
  { term: "Sátira / Parodia", definition: "Son como noticias 'de mentirijillas' que se hacen para hacer reír o para criticar algo de forma graciosa. Imitan el estilo de las noticias serias, ¡pero cuentan cosas inventadas y exageradas! Si no pillas la broma, ¡te la pueden colar como si fuera verdad!", isDefault: true },
  { term: "Sesgo (Bias)", definition: "Imagina que en un partido de fútbol, el comentarista solo habla bien de un equipo y mal del otro. ¡Eso es sesgo! En las noticias, ocurre cuando la información se presenta de forma que favorece más una idea o a un grupo, en lugar de contar todos los lados de la historia de manera equilibrada.", isDefault: true },
  { term: "Titular", definition: "Es como el título de un libro o una película, ¡pero para las noticias! Es esa frase grande y llamativa que ves primero y que intenta contarte de qué va la historia y hacer que quieras leer más.", isDefault: true },
  { term: "Verificar", definition: "¡Es hacer de detective con las noticias! Significa no creerte algo a la primera, sino buscar más información, mirar en otros sitios o preguntar a expertos para estar más seguro de si es verdad o no.", isDefault: true },
  { term: "Viral", definition: "Piensa en un vídeo súper divertido o una noticia muy sorprendente que de repente todo el mundo está viendo y compartiendo en TikTok, WhatsApp o YouTube. ¡Eso es que se ha hecho viral! Se extiende súper rápido, como un resfriado en clase.", isDefault: true }
];

interface GlossaryProcessingItem {
  term: string;
  definition: string;
}

const glossaryForProcessing: GlossaryProcessingItem[] = defaultGlossaryTermsForChatContainer.map(item => ({
  term: item.term,
  definition: item.definition,
}));

const SYSTEM_PROMPT_FAKE_NEWS = `
Rol: Eres un chatbot educativo y amigable llamado Pimpoyo, diseñado para niños de 10-12 años.
Misión Principal: Enseñar a identificar noticias falsas y comprender sus consecuencias.
Flujo de Interacción:
1. Tutorial Inicial: Si es apropiado, comienza con una guía rápida o consejos clave (píldoras informativas) para detectar noticias dudosas. Usa lenguaje sencillo y ejemplos claros. Sé muy breve.
2. Práctica Interactiva / Análisis de Noticias: Cuando el usuario presente una noticia o intente explicar por qué una noticia es falsa:
    - No des la respuesta directa (verdadero/falso) inmediatamente.
    - Guía sutilmente: Anímale a reflexionar haciendo preguntas sobre aspectos específicos. Ej: "¿Has revisado bien la fuente?", "¿Qué te dice la fecha de la noticia?", "¿El titular parece muy exagerado?".
    - Refuerza el esfuerzo: Valida su intento aunque no sea correcto del todo.
Estilo de Comunicación:
- Tono: Entusiasta, paciente y motivador. Como un compañero de aprendizaje.
- Extensión: Mensajes cortos y directos. Prioriza la claridad. Evita párrafos largos.
- Lenguaje: Simple, adecuado para niños de 10-12 años. Evita tecnicismos complejos.
- No afirmes lo que has recibido, es decir, si digo: Explicame como funciona X cosa, no digas: Claro, te explicaré cómo funciona X cosa (respuesta), simplemente responde a la pregunta sin repetirla.
Adaptación Personalizada (Contexto Backend):
- Ocasionalmente, podrías recibir información sobre las áreas de mejora del usuario (como 'area_de_enfoque_sugerida'). Usa esta información para enfocar sutilmente las preguntas o ejemplos en sus puntos débiles, ayudándole a practicar esas habilidades específicas.
Objetivo Final: Que el usuario aprenda a verificar información de forma crítica y autónoma, mediante un proceso interactivo y guiado.
`;

const SYSTEM_PROMPT_FREE_CHAT = `
Rol: Eres un chatbot educativo y amigable llamado Pimpoyo, diseñado para niños de 10-12 años.
Misión Principal: Enseñar o ayudar al usuario sobre las preguntas que tiene.
Flujo de Interacción:
1. El usuario te hará preguntas sobre temas variados, como matemáticas, historia, ciencia, etc.
2. Responde de manera clara y sencilla, proporcionando ejemplos si es necesario.
Estilo de Comunicación:
- Tono: Entusiasta, paciente y motivador. Como un compañero de aprendizaje.
- Extensión: Mensajes cortos y directos. Prioriza la claridad. Evita párrafos largos.
- Lenguaje: Simple, adecuado para niños de 10-12 años. Evita tecnicismos complejos.
- No afirmes lo que has recibido, es decir, si digo: Explicame que es el modelo gemma3:4b de Meta, no digas: Claro, te explicaré cómo funciona el Modelo gemma3:4b de Meta, simplemente responde a la pregunta sin repetirla.
- Tampoco afirmes que has escuchado al usuario, es decir, no digas cosas tipo ---¡Claro! Entiendo lo que quieres decir.--- o similar, simplemente di el resto.
Objetivo Final: Que el usuario aprenda sobre la información que te pregunta, mediante un proceso interactivo y guiado.
`;

// Comentario encima de la función ChatContainer
function ChatContainer({ authToken, onLogout }: ChatContainerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(false);
  const [currentUserInfo, setCurrentUserInfo] = useState<UserInfo | null>(null);
  const [isLoadingUserInfo, setIsLoadingUserInfo] = useState<boolean>(true);
  const [chatError, setChatError] = useState<string>("");
  const [refreshUserInfoToggle, setRefreshUserInfoToggle] = useState<boolean>(false);
  const [isFreeChatMode, setIsFreeChatMode] = useState<boolean>(false);

  const [newsData, setNewsData] = useState<NewsItem[] | null>(null);
  const [isLoadingNews, setIsLoadingNews] = useState<boolean>(false);
  const [newsChallengeState, setNewsChallengeState] = useState<NewsChallengeState | null>(null);
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>('bajo');
  const [correctStreak, setCorrectStreak] = useState<number>(0);
  const [incorrectStreak, setIncorrectStreak] = useState<number>(0);

  const [isSingleNewsAnalysisMode, setIsSingleNewsAnalysisMode] = useState<boolean>(false);
  const [singleNewsAnalysisData, setSingleNewsAnalysisData] = useState<NoticiaParaAnalisis | null>(null);
  const [currentGuidedChatSessionId, setCurrentGuidedChatSessionId] = useState<number | null>(null);
  const [isAwaitingInitialAnalysis, setIsAwaitingInitialAnalysis] = useState<boolean>(false);
  const [guidedAnalysesSubmitted, setGuidedAnalysesSubmitted] = useState<number>(0);
  const [isBotTyping, setIsBotTyping] = useState<boolean>(false);

  const [isPostTestMode, setIsPostTestMode] = useState<boolean>(false);

  const [isTipChallengeActive, setIsTipChallengeActive] = useState<boolean>(false);
  const [selectedTermForSidePanel, setSelectedTermForSidePanel] = useState<string | null>(null); // <--- NUEVO ESTADO
  const [initialPanelSection, setInitialPanelSection] = useState<string | null>(null); // <--- NUEVO ESTADO para la sección inicial


  // Comentario encima de la función fetchUserInfo
  const fetchUserInfo = useCallback(async () => {
    setChatError('');
    if (!authToken) {
      setIsLoadingUserInfo(false);
      return;
    }
    setIsLoadingUserInfo(true);
    try {
      const response = await fetch(`/api/users/me/`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' }
      });
      if (!response.ok) {
        if (response.status === 401) { onLogout(); }
        else {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || `Error ${response.status}`);
        }
        return;
      }
      const userData: UserInfo = await response.json();
      setCurrentUserInfo(userData);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'Failed to load user data.');
    } finally {
      setIsLoadingUserInfo(false);
    }
  }, [authToken, onLogout]);

  useEffect(() => {
    if (authToken && (currentUserInfo === null || refreshUserInfoToggle)) {
      fetchUserInfo();
      if (refreshUserInfoToggle) setRefreshUserInfoToggle(false);
    } else if (!authToken) {
      setCurrentUserInfo(null);
      setIsLoadingUserInfo(false);
    }
  }, [authToken, fetchUserInfo, refreshUserInfoToggle]);

  // Comentario encima de la función createWelcomeMessage
  const createWelcomeMessage = useCallback((): ChatMessage => ({
    id: "welcome-msg-" + Date.now(),
    sender: "bot",
    text: `¡Encantado de conocerte, ${currentUserInfo?.apodo || "Usuario"}! Soy Pimpoyo. Puedo ayudarte con tips y consejos, descifrar noticias falsas o simplemente conversar un rato.`,
    avatar: BOT_AVATAR_URL,
    timestamp: Date.now(),
  }), [currentUserInfo]);

  useEffect(() => {
    if (!isLoadingUserInfo && currentUserInfo && messages.length === 0 && !isPostTestMode) {
      const initialButtonsMessage: ChatMessage = {
        id: "buttons-msg-" + Date.now(), sender: "bot", text: "¿Cómo empezamos?", avatar: BOT_AVATAR_URL, timestamp: Date.now() + 1,
        buttons: [
          { id: "btn-tips", text: "TIPS Y CONSEJOS" },
          { id: "btn-news", text: "DESCIFRAR NOTICIAS" },
          { id: "btn-talk", text: "SÓLO CHARLAR" },
        ],
        buttonsDisabled: false,
      };
      setIsFreeChatMode(false);
      setMessages([createWelcomeMessage(), initialButtonsMessage]);
    }
  }, [isLoadingUserInfo, currentUserInfo, createWelcomeMessage, messages.length, isPostTestMode]);

  // Comentario encima de la función togglePanel
  const togglePanel = () => {
    if (isPanelOpen) { // Si el panel se va a cerrar
      setSelectedTermForSidePanel(null);
      setInitialPanelSection(null);
    }
    setIsPanelOpen(prev => !prev);
  };

  // Comentario encima de la función closePanel
  const closePanel = () => {
    setIsPanelOpen(false);
    setSelectedTermForSidePanel(null); // Resetea al cerrar
    setInitialPanelSection(null);    // Resetea al cerrar
  };

  // Comentario encima de la función handleSettingsSaved
  const handleSettingsSaved = () => setRefreshUserInfoToggle(true);
  // Comentario encima de la función addUserChoiceMessage
  const addUserChoiceMessage = useCallback((text: string) => {
    if (!currentUserInfo) return;
    setMessages(prev => [...prev, {
      id: Date.now() + Math.random(), sender: "user", text,
      avatar: currentUserInfo?.avatar_url || USER_AVATAR_URL_DEFAULT, timestamp: Date.now(),
    }]);
  }, [currentUserInfo]);

  // Comentario encima de la función addBotResponse
  const addBotResponse = useCallback((
      text: string | null,
      buttons: MessageButton[] = [],
      delay: number = 300,
      onMessageAdded?: (id: string | number) => void,
      htmlContent: string | null = null,
      challengeCard: TipChallengeCard | null = null,
      interactiveContent?: React.ReactNode
  ) => {
    setIsBotTyping(false);
    const botMsgId = "bot-msg-" + Date.now() + Math.random();
    const botMsg: ChatMessage = {
      id: botMsgId,
      sender: "bot",
      text: interactiveContent ? null : text,
      htmlContent: interactiveContent ? null : htmlContent,
      interactiveContent: interactiveContent,
      avatar: BOT_AVATAR_URL,
      timestamp: Date.now() + delay,
      buttons,
      buttonsDisabled: buttons.length === 0 && !challengeCard,
      challengeCard: challengeCard
    };
    setTimeout(() => {
      setMessages(prev => [...prev, botMsg]);
      if (onMessageAdded) onMessageAdded(botMsgId);
    }, delay);
    return botMsgId;
  }, [BOT_AVATAR_URL, setMessages, setIsBotTyping]); // Eliminado BOT_AVATAR_URL de dependencias si es constante global

  // Define el manejador del clic para los términos del glosario
  const handleGlossaryTermClick = useCallback((term: string) => {
    console.log(`Término del glosario "${term}" clickeado/activado desde ChatContainer.`);
    setSelectedTermForSidePanel(term);
    setInitialPanelSection('glossary'); // Indica al SidePanel que se abra en la sección 'glossary'
    setIsPanelOpen(true);             // Abre el SidePanel
  }, [setIsPanelOpen, setSelectedTermForSidePanel, setInitialPanelSection]); // Dependencias del useCallback


  // Comentario encima de la función displayTipAndChallenge
  const displayTipAndChallenge = useCallback((tipIndex: number) => {
    const tip = tips[tipIndex];
    if (!tip) return;

    const rawTipText = `${tip.title}\n\n${tip.text}`;

    const processedTipContent = processTextForGlossary(
      rawTipText,
      glossaryForProcessing,
      handleGlossaryTermClick // <--- USA EL NUEVO MANEJADOR AQUÍ
    );

    let challengeCardPayload: TipChallengeCard | null = null;
    const navigationOrActionButtons: MessageButton[] = [];

    if (tip.challenge && tip.challenge.options) {
        challengeCardPayload = {
            question: tip.challenge.question,
            options: tip.challenge.options.map(opt => ({
                id: `btn-tip-challenge-${tipIndex}-opt-${opt.id}`,
                text: opt.text
            }))
        };
        setIsTipChallengeActive(true);
    } else {
        setIsTipChallengeActive(false);
        if (tipIndex > 0) {
            navigationOrActionButtons.push({ id: `btn-tip-prev-${tipIndex}`, icon: faArrowLeft, ariaLabel: 'Anterior Consejo' });
        }
        if (tipIndex < tips.length - 1) {
            navigationOrActionButtons.push({ id: `btn-tip-next-${tipIndex}`, icon: faArrowRight, ariaLabel: 'Siguiente Consejo' });
        } else {
            navigationOrActionButtons.push({ id: "btn-tip-understood", text: "¡Entendido, Pimpoyo!" });
        }
    }

    addBotResponse(
      null,
      navigationOrActionButtons,
      300,
      undefined,
      null,
      challengeCardPayload,
      <>{processedTipContent}</>
    );

  }, [addBotResponse, setIsTipChallengeActive, handleGlossaryTermClick, glossaryForProcessing]); // Añade handleGlossaryTermClick y glossaryForProcessing


  // Comentario encima de la función increaseDifficulty
  const increaseDifficulty = useCallback(() => {
    const currentIndex = difficultyOrder.indexOf(difficultyLevel);
    if (currentIndex < difficultyOrder.length - 1) {
      const nextLevel = difficultyOrder[currentIndex + 1];
      setDifficultyLevel(nextLevel); console.log(`Difficulty increased to: ${nextLevel}`); return true;
    } console.log(`Already at max difficulty: ${difficultyLevel}`); return false;
  }, [difficultyLevel]);

  // Comentario encima de la función decreaseDifficulty
  const decreaseDifficulty = useCallback(() => {
    const currentIndex = difficultyOrder.indexOf(difficultyLevel);
    if (currentIndex > 0) {
      const prevLevel = difficultyOrder[currentIndex - 1];
      setDifficultyLevel(prevLevel); console.log(`Difficulty decreased to: ${prevLevel}`); return true;
    } console.log(`Already at min difficulty: ${difficultyLevel}`); return false;
  }, [difficultyLevel]);

  // Comentario encima de la función resetSingleAnalysisMode
  const resetSingleAnalysisMode = useCallback(() => {
    setIsSingleNewsAnalysisMode(false);
    setSingleNewsAnalysisData(null);
    setCurrentGuidedChatSessionId(null);
    setIsAwaitingInitialAnalysis(false);
  }, []);

  // Comentario encima de la función processTwoNewsChallenge
  const processTwoNewsChallenge = useCallback((currentNewsData: NewsItem[], introId: string | number) => {
    const newsAtCurrentLevel = currentNewsData.filter(item => item.DIFFICULTY_LEVEL === difficultyLevel);
    const trueNewsFiltered = newsAtCurrentLevel.filter(item => item.CATEGORY === 'TRUE');
    const falseNewsFiltered = newsAtCurrentLevel.filter(item => item.CATEGORY === 'FALSE');

    if (trueNewsFiltered.length === 0 || falseNewsFiltered.length === 0) {
        const missingType = trueNewsFiltered.length === 0 ? 'verdaderas' : 'falsas';
        setMessages(prev => prev.map(msg => msg.id === introId ? { ...msg, text: `¡Vaya! No encontré suficientes noticias ${missingType} de nivel "${difficultyLevel}" para este desafío.` } : msg));
        addBotResponse("¿Quieres intentar con otro nivel o hacer otra cosa?", [
            { id: "btn-tips-again", text: "Ver tips" }, { id: "btn-talk-again", text: "Sólo Charlar" },
        ], 300);
        setIsLoadingNews(false);
        return;
    }
    const selectedTrueNews = trueNewsFiltered[Math.floor(Math.random() * trueNewsFiltered.length)];
    const selectedFalseNews = falseNewsFiltered[Math.floor(Math.random() * falseNewsFiltered.length)];
    const showTrueOnLeft = Math.random() < 0.5;
    const leftNewsItem = showTrueOnLeft ? selectedTrueNews : selectedFalseNews;
    const rightNewsItem = showTrueOnLeft ? selectedFalseNews : selectedTrueNews;
const createMobileViewHtml = (newsItem: NewsItem): string => {
    // Función para escapar caracteres HTML y evitar problemas de seguridad o visuales
    const escapeHtml = (unsafe: string | null | undefined): string => {
        if (!unsafe) return '';
        return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    };

    // Nueva función que busca y formatea la fecha desde el LINK
    const extractAndFormatDateFromLink = (link: string | undefined | null): string => {
        if (!link) {
            return ""; // Si no hay enlace, no hace nada
        }
        try {
            // Esta expresión busca un patrón de fecha como /AAAA/MM/DD/ o /AAAA-MM-DD/
            const dateRegex = /(\d{4})[\/-](\d{2})[\/-](\d{2})/;
            const match = link.match(dateRegex);

            // Si encuentra una fecha en el enlace...
            if (match) {
               const date = new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10));

                const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
                return ` • ${date.toLocaleDateString('es-ES', options)}`;
            }
            return "";
        } catch (e) {
            return "";
        }
    };

    const formattedTextHtml = escapeHtml(newsItem.TEXT || '')
        .split('\n')
        .filter(p => p.trim() !== '')
        .map(p => `<p>${p}</p>`)
        .join('');

    const kicker = (newsItem.TOPICS || 'General').split(',')[0].trim().toUpperCase();
    const imageSeed = escapeHtml(newsItem.ID || 'default-image');
    const sourceText = escapeHtml(newsItem.SOURCE ?? 'Fuente desconocida');
    const headlineText = escapeHtml(newsItem.HEADLINE ?? 'Titular no disponible');
    const publicationDateText = extractAndFormatDateFromLink(newsItem.LINK);

    return `
      <div class="mobile-news-view">
        <div class="news-image-header" style="background-image: url('https://picsum.photos/seed/${imageSeed}/400/200');"></div>
        <div class="mobile-news-content">
          <span class="news-kicker">${kicker}</span>
          <h2 class="mobile-news-headline">${headlineText}</h2>
          <div class="news-metadata">
            <span class="news-source">Por <strong>${sourceText}</strong></span>
            <span class="news-date">${publicationDateText}</span>
          </div>
          <hr class="news-separator" />
          <div class="mobile-news-text-scroll">
            ${formattedTextHtml || '<p>Contenido no disponible.</p>'}
          </div>
        </div>
      </div>
    `;
};
    const leftHtml = createMobileViewHtml(leftNewsItem);
    const rightHtml = createMobileViewHtml(rightNewsItem);
    const combinedHtml = `<div class="news-challenge-container">${leftHtml}${rightHtml}</div>`;
    setMessages(prev => prev.map(msg => msg.id === introId ? { ...msg, text: `¡Aquí tienes! Una REAL y una FALSA:` } : msg));
    const presentationMessage: ChatMessage = { id: "news-pres-" + Date.now(), sender: 'bot', avatar: BOT_AVATAR_URL, text: null, htmlContent: combinedHtml, timestamp: Date.now() + 300, buttons: [], buttonsDisabled: true, };
    setTimeout(() => { setMessages(prev => [...prev, presentationMessage]); }, 300);
    const selectionMessageId = addBotResponse( "¿Cuál de las dos noticias crees que es la VERDADERA?", [{ id: `select-news-left`, text: "Noticia izquierda (1)" }, { id: `select-news-right`, text: "Noticia derecha (2)" }], 800 );
    setNewsChallengeState({ trueNewsOriginalId: selectedTrueNews.ID, leftNewsOriginalId: leftNewsItem.ID, rightNewsOriginalId: rightNewsItem.ID, selectionMessageId: selectionMessageId as string, });
    setIsLoadingNews(false);
  }, [difficultyLevel, addBotResponse, setIsLoadingNews, setMessages, setNewsChallengeState]);

  // Comentario encima de la función presentNewsChallenge
  const presentNewsChallenge = useCallback(async (forceSingleAnalysisMode: boolean = false) => {
    if (isLoadingNews) return;
    setIsLoadingNews(true);
    setChatError('');
    resetSingleAnalysisMode();
    setNewsChallengeState(null);
    setIsTipChallengeActive(false);

    const shouldUseSingleAnalysis = forceSingleAnalysisMode || (
        (difficultyLevel === 'medio' || difficultyLevel === 'alto') && Math.random() < 0.6
    );

    let introMessage = `Buscando desafío...`;
    try {
        const response = await fetch('/api/activity/guided-analysis/next-news', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (response.status === 401) { onLogout(); throw new Error("Sesión expirada."); }
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: `Error ${response.status}` }));
            throw new Error(errorData.detail || `No se pudo cargar la noticia para análisis: ${response.status}`);
        }
        const newsToAnalyze: NoticiaParaAnalisis = await response.json();
        setSingleNewsAnalysisData({...newsToAnalyze, initialUserEvaluation: undefined });
        setIsSingleNewsAnalysisMode(true);

        setMessages(prev => prev.map(msg => msg.id === introId ? { ...msg, text: `Analicemos esta noticia:` } : msg));

        const newsItemForDisplay: NewsItem = {
            ID: newsToAnalyze.noticia_id_json,
            HEADLINE: newsToAnalyze.headline,
            TEXT: newsToAnalyze.text,
            SOURCE: newsToAnalyze.source || 'Fuente no especificada',
            TOPICS: newsToAnalyze.difficulty_level || 'Análisis',
            LINK: '',
            CATEGORY: 'TRUE',
            DIFFICULTY_LEVEL: 'medio'
        };

        const newsCardHtml = createMobileViewHtml(newsItemForDisplay);
        const finalHtml = `<div class="single-news-wrapper">${newsCardHtml}</div>`;

        addBotResponse(null, [], 100, undefined, finalHtml);

        setTimeout(() => {
            addBotResponse(
                "Léela con atención. Cuando estés listo/a, dime: ¿Crees que esta noticia es Verdadera o Falsa? Y, lo más importante, ¿por qué piensas eso? Escribe tu análisis completo aquí abajo.",
                [], 300
            );
            setIsAwaitingInitialAnalysis(true);
        }, 1200);

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Error desconocido";
        if (errorMsg !== "Sesión expirada.") {
            setMessages(prev => prev.map(msg => msg.id === introId ? { ...msg, text: `¡Ups! No pude cargar una noticia para analizar (${errorMsg}).` } : msg));
            addBotResponse("¿Probamos otra cosa?", [{ id: "btn-news-again", text: "Otro desafío" }, { id: "btn-talk-again", text: "Sólo charlar" }], 300);
        }
        resetSingleAnalysisMode();
    } finally {
        setIsLoadingNews(false);
    }

    const introId = addBotResponse(introMessage, [], 0);

    if (shouldUseSingleAnalysis) {
        try {
            const response = await fetch('/api/activity/guided-analysis/next-news', {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: `Error ${response.status}` }));
                throw new Error(errorData.detail || `No se pudo cargar la noticia para análisis: ${response.status}`);
            }
            const newsToAnalyze: NoticiaParaAnalisis = await response.json();
            setSingleNewsAnalysisData({...newsToAnalyze, initialUserEvaluation: undefined });
            setIsSingleNewsAnalysisMode(true);

            setMessages(prev => prev.map(msg => msg.id === introId ? { ...msg, text: `Analicemos esta noticia:` } : msg));

            const newsHtml = `
                <div class="single-news-display" style="background-color: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin-top: 10px;">
                    <h2>${newsToAnalyze.headline}</h2>
                    ${newsToAnalyze.source ? `<p style="font-style: italic; color: #555; font-size: 0.9em;">Fuente: ${newsToAnalyze.source}</p>` : ''}
                    <div class="single-news-text-scroll" style="max-height: 200px; overflow-y: auto; margin-top: 10px; line-height: 1.5;">
                        ${newsToAnalyze.text.split('\n').filter((p: string) => p.trim() !== '').map((p: string) => `<p>${p}</p>`).join('')}
                    </div>
                </div>`;
            addBotResponse(null, [], 100, undefined, newsHtml);

            setTimeout(() => {
                addBotResponse(
                    "Léela con atención. Cuando estés listo/a, dime: ¿Crees que esta noticia es Verdadera o Falsa? Y, lo más importante, ¿por qué piensas eso? Escribe tu análisis completo aquí abajo.",
                    [], 300
                );
                setIsAwaitingInitialAnalysis(true);
            }, 1200);

        } catch (error) {
            console.error("Error fetching single news for analysis:", error);
            const errorMsg = error instanceof Error ? error.message : "Error desconocido";
            setMessages(prev => prev.map(msg => msg.id === introId ? { ...msg, text: `¡Ups! No pude cargar una noticia para analizar (${errorMsg}).` } : msg));
            addBotResponse("¿Probamos otra cosa?", [
                { id: "btn-news-again", text: "Otro Desafío" }, { id: "btn-talk-again", text: "Sólo Charlar" },
            ], 300);
            resetSingleAnalysisMode();
        } finally {
            setIsLoadingNews(false);
        }
    } else {
        if (!newsData) {
             try {
                const response = await fetch('/api/news/challenge', { headers: { 'Authorization': `Bearer ${authToken}` } });
                if (!response.ok) throw new Error((await response.json().catch(() => ({}))).detail || "Error cargando noticias");
                const allFetchedNews: NewsItem[] = await response.json();
                if (!Array.isArray(allFetchedNews) || allFetchedNews.length === 0) throw new Error("No se recibieron noticias válidas");
                setNewsData(allFetchedNews);
                processTwoNewsChallenge(allFetchedNews, introId);
            } catch (error) {
                console.error("Failed to load news data from API:", error);
                const errorMsg = error instanceof Error ? error.message : "Error desconocido";
                setMessages(prev => prev.map(msg => msg.id === introId ? { ...msg, text: `¡Ups! Hubo un problema al buscar las noticias (${errorMsg}).` } : msg));
                addBotResponse("¿Probamos otra cosa?", [{ id: "btn-tips-again", text: "Ver tips" }, { id: "btn-talk-again", text: "Sólo Charlar" }], 300);
                setIsLoadingNews(false);
            }
        } else {
             processTwoNewsChallenge(newsData, introId);
        }
    }
  }, [authToken, difficultyLevel, addBotResponse, resetSingleAnalysisMode, processTwoNewsChallenge, newsData, setMessages, setIsLoadingNews, setChatError, setNewsData, setNewsChallengeState, setIsTipChallengeActive, setSingleNewsAnalysisData, setIsSingleNewsAnalysisMode, setIsAwaitingInitialAnalysis]);

  // Comentario encima de la función handleMessageButtonClick
  const handleMessageButtonClick = useCallback(async (messageId: number | string, buttonId: string) => {
    console.log(`Button Clicked: MessageID=${messageId}, ButtonID=${buttonId}`);

     if (!buttonId.startsWith("btn-tip-challenge-")) {
        setMessages(current => current.map(msg => {
            if (msg.id === messageId && !msg.buttons?.some(b => b.id.startsWith("btn-tip-challenge-"))) {
                return { ...msg, buttonsDisabled: true };
            }
            if (newsChallengeState && msg.id === newsChallengeState.selectionMessageId && !buttonId.startsWith("select-news-")) {
                 return { ...msg, buttonsDisabled: true };
            }
            return msg;
        }));
    }

    if (buttonId.startsWith("btn-tip-challenge-")) {
        setMessages(current => current.map(msg => {
            if (msg.id === messageId) {
                return { ...msg, buttonsDisabled: true };
            }
            return msg;
        }));

        const parts = buttonId.split('-');
        const tipIdxChallenge = parseInt(parts[3], 10);
        const optionId = parts[5];
        const tipForChallenge = tips[tipIdxChallenge];

        if (tipForChallenge && tipForChallenge.challenge && tipForChallenge.challenge.options) {
            const chosenOption = tipForChallenge.challenge.options.find(opt => opt.id === optionId);
            if (chosenOption) {
                addUserChoiceMessage(chosenOption.text);
                const feedback = chosenOption.isCorrect ? tipForChallenge.challenge.feedbackCorrect : tipForChallenge.challenge.feedbackIncorrect;
                addBotResponse(feedback, [], 300, () => {
                    const navButtons: MessageButton[] = [];
                    if (tipIdxChallenge > 0) {
                        navButtons.push({ id: `btn-tip-prev-${tipIdxChallenge}`, icon: faArrowLeft, ariaLabel: 'Anterior Consejo' });
                    }
                    if (tipIdxChallenge < tips.length - 1) {
                        navButtons.push({ id: `btn-tip-next-${tipIdxChallenge}`, icon: faArrowRight, ariaLabel: 'Siguiente Consejo' });
                    } else {
                        navButtons.push({ id: "btn-tip-understood", text: "¡Entendido, Pimpoyo!" });
                    }
                    addBotResponse("¿Seguimos adelante?", navButtons);
                });
            }
        }
        setIsTipChallengeActive(false);
        return;
    }

    if (buttonId.startsWith("btn-tip-next-") || buttonId.startsWith("btn-tip-prev-")) {
        const isNext = buttonId.startsWith("btn-tip-next-");
        const baseIndexFromButton = parseInt(buttonId.split("-").pop() || "0", 10);
        let targetIndex = isNext ? baseIndexFromButton + 1 : baseIndexFromButton -1;

        if (targetIndex >= 0 && targetIndex < tips.length) {
            displayTipAndChallenge(targetIndex);
        } else if (isNext && targetIndex >= tips.length) {
            addUserChoiceMessage("He entendido los consejos");
            addBotResponse("¡Genial! Recordar estos consejos te ayudará mucho a ser un gran detective de noticias. 👍 \n\n¿Qué quieres hacer ahora?", [
                { id: "btn-news-again", text: "Descifrar noticias" },
                { id: "btn-talk-again", text: "Sólo charlar" },
                { id: "btn-tips-again", text: "Repasar los tips" }
            ]);
        }
        return;
    }

    if (buttonId === "btn-tips" || buttonId === "btn-tips-again" || buttonId === "btn-repeat-tips-yes") {
      setIsFreeChatMode(false);
      resetSingleAnalysisMode();
      setNewsChallengeState(null);
      setIsTipChallengeActive(false);

      if (buttonId === "btn-tips") addUserChoiceMessage("Quiero TIPS Y CONSEJOS");
      else addUserChoiceMessage("Repasar los Tips");

      displayTipAndChallenge(0);
      return;
    }
    if (buttonId === "btn-finish-analysis" && isSingleNewsAnalysisMode && currentGuidedChatSessionId) {
        addUserChoiceMessage("Terminar análisis y ver solución.");
        setIsBotTyping(true);
        try {
          addBotResponse("Revisando tu análisis y preparando la solución...", [], 0);
          const response = await fetch(`/api/activity/guided-analysis/finish-news/${currentGuidedChatSessionId}`, {
            method: 'POST', headers: { 'Authorization': `Bearer ${authToken}` }
          });
          setIsBotTyping(false);
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: `Error ${response.status}` }));
            throw new Error(errorData.detail || "No se pudo finalizar el análisis y obtener la solución.");
          }
          const result = await response.json();
          addBotResponse(result.message || "¡Análisis completado!", [], 300);

          addBotResponse("¿Qué hacemos ahora?", [
            { id: "btn-news-again", text: "Siguiente desafío" },
            { id: "btn-talk-again", text: "Sólo charlar" },
          ], 500);

        } catch (error) {
            setIsBotTyping(false);
            addBotResponse(`Error al finalizar y mostrar solución: ${error instanceof Error ? error.message : 'Desconocido'}.`, [
                { id: "btn-news-again", text: "Otro Desafío" }, { id: "btn-talk-again", text: "Sólo Charlar" },
            ]);
        }
        finally {
            resetSingleAnalysisMode();
        }
        return;
    } else if (buttonId === "btn-finish-analysis-anyway") {
        addUserChoiceMessage("Terminar Análisis Igualmente.");
         if (currentGuidedChatSessionId) {
            addBotResponse("De acuerdo, finalizando este análisis.", [], 0);
         }
        addBotResponse("¿Qué hacemos ahora?", [
            { id: "btn-news-again", text: "Otro Desafío" }, { id: "btn-talk-again", text: "Sólo Charlar" },
        ], 300);
        resetSingleAnalysisMode();
        return;
    }

    if (buttonId === "btn-news" || buttonId === "btn-news-again") {
      setIsFreeChatMode(false);
      setIsTipChallengeActive(false);
      addUserChoiceMessage(buttonId === "btn-news" ? "Quiero DESCIFRAR NOTICIAS" : (buttonId === "btn-news-again" ? "¡Otro Desafío!" : "Otro Desafío de Noticias"));
      presentNewsChallenge();
      return;
    }
    if (buttonId === "btn-talk" || buttonId === "btn-talk-again") {
      setIsFreeChatMode(true);
      resetSingleAnalysisMode();
      setIsTipChallengeActive(false);
      addUserChoiceMessage(buttonId === "btn-talk" ? "Prefiero SÓLO CHARLAR" : "Sólo Charlar un rato");
      addBotResponse("¡Claro! ¿De qué te gustaría hablar hoy?", []);
      setNewsChallengeState(null);
      return;
    }

    if (buttonId === "btn-tip-understood") {
      addUserChoiceMessage("¡Entendido, Pimpoyo!");
      addBotResponse("¡Genial! Recordar estos consejos te ayudará mucho a ser un gran detective de noticias. 👍 \n\n¿Qué quieres hacer ahora?", [
        { id: "btn-news-again", text: "" },
        { id: "btn-talk-again", text: "Sólo Charlar" },
        { id: "btn-tips-again", text: "Repasar los Tips" }
      ]);
      setIsTipChallengeActive(false);
      return;
    }


    if (newsChallengeState && buttonId.startsWith("select-news-")) {
      setMessages(current => current.map(msg => msg.id === newsChallengeState.selectionMessageId ? { ...msg, buttonsDisabled: true } : msg));
      const choseLeft = buttonId === "select-news-left";
      const choiceText = choseLeft ? "Noticia Izquierda" : "Noticia Derecha";
      addUserChoiceMessage(`Creo que la verdadera es: ${choiceText}`);

      const veamosId = addBotResponse("Veamos...", [],0);
      setIsBotTyping(true);

      const selectedNewsId = choseLeft ? newsChallengeState.leftNewsOriginalId : newsChallengeState.rightNewsOriginalId;
      let actualFalseNewsId = "";

      if (!newsChallengeState.trueNewsOriginalId || !newsChallengeState.leftNewsOriginalId || !newsChallengeState.rightNewsOriginalId) {
        console.error("Error: IDs de noticias faltantes en newsChallengeState", newsChallengeState);
        setMessages(prev => prev.filter(m => m.id !== veamosId));
        setIsBotTyping(false);
        addBotResponse("Hubo un problema interno al identificar las noticias. Intenta de nuevo o elige otra opción.", [
            { id: "btn-news-again", text: "Jugar otra vez" }, { id: "btn-talk-again", text: "Sólo Charlar" },
        ]);
        setNewsChallengeState(null); return;
      }
      actualFalseNewsId = newsChallengeState.leftNewsOriginalId === newsChallengeState.trueNewsOriginalId ? newsChallengeState.rightNewsOriginalId : newsChallengeState.leftNewsOriginalId;

      if (typeof newsChallengeState.trueNewsOriginalId !== 'string' || !newsChallengeState.trueNewsOriginalId ||
          typeof actualFalseNewsId !== 'string' || !actualFalseNewsId ||
          typeof selectedNewsId !== 'string' || !selectedNewsId) {
          console.error("Error: Uno o más IDs de noticias para el payload no son válidos.", { trueNewsOriginalId: newsChallengeState.trueNewsOriginalId, actualFalseNewsId, selectedNewsId });
          setMessages(prev => prev.filter(m => m.id !== veamosId));
          setIsBotTyping(false);
          addBotResponse("Hubo un error al procesar tu elección debido a IDs de noticias inválidos. Por favor, intenta de nuevo.", [
            { id: "btn-news-again", text: "Jugar otra vez" }, { id: "btn-talk-again", text: "Sólo Charlar" },
          ]);
          setNewsChallengeState(null); return;
      }

      const payload: FinishPairChallengePayload = {
        noticia_verdadera_id_json: newsChallengeState.trueNewsOriginalId,
        noticia_falsa_id_json: actualFalseNewsId,
        seleccion_usuario_id_json: selectedNewsId,
      };

      try {
        const response = await fetch('/api/challenge/finish-pair-selection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
          body: JSON.stringify(payload)
         });
        setMessages(prev => prev.filter(m => m.id !== veamosId));
        setIsBotTyping(false);

        if (!response.ok) {
            let errorContentToThrow = `Error ${response.status}`;
            try {
                const errorData = await response.json();
                errorContentToThrow = errorData.detail || errorContentToThrow;
            } catch (e) { console.error("Error parsing error response:", e); }
            throw new Error(errorContentToThrow);
        }

        const result: FinishPairChallengeResponse = await response.json();
        const isCorrectBackend = result.es_correcto;
        let difficultyChangedMessage: string | null = null;
        let tempCorrectStreak = correctStreak;

        if (isCorrectBackend) {
            tempCorrectStreak = correctStreak + 1;
            setCorrectStreak(prev => prev + 1);
            setIncorrectStreak(0);
            if (tempCorrectStreak >= 3) {
                if (increaseDifficulty()) {
                    difficultyChangedMessage = "¡Tres seguidas! 😎 ¡Subimos un poco la dificultad!";
                    setCorrectStreak(0);
                    tempCorrectStreak = 0;
                } else {
                   if (tempCorrectStreak % 3 === 0) {
                        difficultyChangedMessage = "¡Imparable! Sigues dominando el nivel más alto. 🔥";
                   }
                }
            }
        } else {
            const newIncStreak = incorrectStreak + 1;
            setIncorrectStreak(newIncStreak);
            setCorrectStreak(0);
            tempCorrectStreak = 0;
            if (newIncStreak >= 3) {
                if (decreaseDifficulty()) {
                    difficultyChangedMessage = "¡Ánimo! 💪 Vamos a probar con unas un poco más sencillas.";
                    setIncorrectStreak(0);
                } else {
                    setIncorrectStreak(0);
                }
            }
        }

        let feedbackText = "";
        if (isCorrectBackend) {
            feedbackText = `✅ ¡Correcto! La ${choiceText.toLowerCase()} era la verdadera.`;
        } else {
            const correctPos = (newsChallengeState.leftNewsOriginalId === newsChallengeState.trueNewsOriginalId) ? "la izquierda" : "la derecha";
            feedbackText = `❌ ¡Ups! La ${choiceText.toLowerCase()} era la falsa. La verdadera era ${correctPos}.`;
        }
        if (result.explanation) {
            feedbackText += ` ${result.explanation}`;
        }

        let feedbackPresentationDelay = 300;
        if (difficultyChangedMessage) {
            addBotResponse(difficultyChangedMessage, [], 300);
            feedbackPresentationDelay = 800;
        }
        addBotResponse(feedbackText, [], feedbackPresentationDelay);

        const nextStepButtons: MessageButton[] = [
            { id: "btn-news-again", text: "Siguiente desafío" },
            { id: "btn-tips-again", text: "Ver tips" },
            { id: "btn-talk-again", text: "Sólo charlar" }
        ];
        const isThreeStreakSpecialAndLevelUp = isCorrectBackend && tempCorrectStreak > 0 && tempCorrectStreak % 3 === 0 && difficultyChangedMessage && difficultyChangedMessage.includes("¡Subimos un poco la dificultad!");

        if (isThreeStreakSpecialAndLevelUp) { // Esto debería ser tempCorrectStreak === 0 porque se reseteó
             nextStepButtons[0].text = "Siguiente desafío (¡Nivel subido!)";
        }


        addBotResponse("¿Qué quieres hacer ahora?", nextStepButtons, feedbackPresentationDelay + 300);
      } catch (error) {
        setIsBotTyping(false);
        setMessages(prev => prev.filter(m => m.id !== veamosId));
        console.error("Error en desafío de pares:", error);
        addBotResponse(`Error al procesar tu elección: ${error instanceof Error ? error.message : 'Desconocido'}.`, [
            { id: "btn-news-again", text: "Jugar otra vez" }, { id: "btn-talk-again", text: "Sólo charlar" },
        ]);
      }
      finally { setNewsChallengeState(null); }
      return;
    }
  }, [
    authToken, addUserChoiceMessage, addBotResponse, presentNewsChallenge, newsChallengeState,
    correctStreak, incorrectStreak, increaseDifficulty, decreaseDifficulty, difficultyLevel,
    isSingleNewsAnalysisMode, currentGuidedChatSessionId, displayTipAndChallenge,
    setMessages, setIsBotTyping, resetSingleAnalysisMode, setIsTipChallengeActive, setNewsChallengeState,
    glossaryForProcessing, handleGlossaryTermClick, // Añadidas para displayTipAndChallenge
    setIsPanelOpen, setSelectedTermForSidePanel, setInitialPanelSection // Añadidas para handleGlossaryTermClick
  ]);

  // Comentario encima de la función handleSendMessage
  const handleSendMessage = async (inputText: string) => {
    if (!inputText.trim() || !currentUserInfo) return;

    if (isTipChallengeActive) {
        addBotResponse("Por favor, responde al reto del consejo usando los botones.", [], 0);
        return;
    }

    const newUserMessage: ChatMessage = {
      id: Date.now() + Math.random(), sender: "user", text: inputText,
      avatar: currentUserInfo?.avatar_url || USER_AVATAR_URL_DEFAULT, timestamp: Date.now(),
    };
    setMessages(currentMessages => [...currentMessages, newUserMessage]);

    setIsBotTyping(true);

    if (isSingleNewsAnalysisMode && isAwaitingInitialAnalysis && singleNewsAnalysisData) {
      setIsAwaitingInitialAnalysis(false);
      let evaluacion: 'TRUE' | 'FALSE' | 'UNSURE' | null = null;
      const lowerInput = inputText.toLowerCase();
      if (/\b(es\s+)?verdadera\b/.test(lowerInput) && !/\bno\s+(es\s+)?verdadera\b/.test(lowerInput)) evaluacion = 'TRUE';
      else if (/\b(es\s+)?falsa\b/.test(lowerInput) && !/\bno\s+(es\s+)?falsa\b/.test(lowerInput)) evaluacion = 'FALSE';
      else if (/\b(no\s+estoy\s+segur|no\s+s[eé]|dudo)\b/.test(lowerInput)) evaluacion = 'UNSURE';

      if (singleNewsAnalysisData) {
          setSingleNewsAnalysisData(prevData => prevData ? { ...prevData, initialUserEvaluation: evaluacion } : null);
      }

      const payload: ExplicacionInicialPayload = {
        noticia_id_json: singleNewsAnalysisData.noticia_id_json,
        explicacion_usuario: inputText,
        evaluacion_inicial_opcional: evaluacion,
        ...(singleNewsAnalysisData.area_de_enfoque_sugerida && { area_de_enfoque_sugerida: singleNewsAnalysisData.area_de_enfoque_sugerida })
      };
      try {
        const response = await fetch('/api/activity/guided-analysis/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
          body: JSON.stringify(payload),
        });
        if (!response.ok) { throw new Error((await response.json().catch(() => ({}))).detail || `Error ${response.status}`); }
        const responseData: ChatGuiaResponse = await response.json();

        setCurrentGuidedChatSessionId(responseData.chat_sesion_noticia_id);
        addBotResponse(responseData.respuesta_chatbot, [], 500);

        const newSubmittedCount = guidedAnalysesSubmitted + 1;
        setGuidedAnalysesSubmitted(newSubmittedCount);

        let buttonsForInitialGuidedPhase: MessageButton[] = [
            { id: "btn-finish-analysis", text: "Terminar análisis y ver solución" }
        ];
        if (newSubmittedCount >= 5) {
            buttonsForInitialGuidedPhase.push({ id: "btn-tips-again", text: "Ver tips" });
        }
        addBotResponse(
            "Puedes seguir preguntándome sobre esta noticia si tienes más dudas, o si ya estás listo/a:",
            buttonsForInitialGuidedPhase,
            600
        );
      } catch (error) {
        setIsBotTyping(false);
        addBotResponse(`Error al procesar tu análisis inicial: ${error instanceof Error ? error.message : 'Desconocido'}.`, [
            { id: "btn-news-again", text: "Otro Desafío" }, { id: "btn-talk-again", text: "Sólo Charlar" }
        ]);
        resetSingleAnalysisMode();
      }

    } else if (isSingleNewsAnalysisMode && currentGuidedChatSessionId && singleNewsAnalysisData) {
      const payload: ContinuarChatGuiaPayload = {
        mensaje_usuario: inputText,
      };
      try {
        const response = await fetch(`/api/activity/guided-analysis/chat/${currentGuidedChatSessionId}/continue`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
            body: JSON.stringify(payload),
        });
        if (!response.ok) { throw new Error((await response.json().catch(() => ({}))).detail || `Error ${response.status}`);}
        const responseData: ChatGuiaResponse = await response.json();
        addBotResponse(responseData.respuesta_chatbot, [], 500);

        let buttonsForContinuedGuidedPhase: MessageButton[] = [
            { id: "btn-finish-analysis", text: "Terminar análisis y ver solución" }
        ];
        if (guidedAnalysesSubmitted >= 5) {
             buttonsForContinuedGuidedPhase.push({ id: "btn-tips-again", text: "Ver tips" });
        }
        addBotResponse(
            "Puedes seguir preguntándome, o si prefieres:",
            buttonsForContinuedGuidedPhase,
            600
        );
      } catch (error) {
        setIsBotTyping(false);
        addBotResponse(`Error continuando la conversación guiada: ${error instanceof Error ? error.message : 'Desconocido'}.`, [
            { id: "btn-finish-analysis-anyway", text: "Terminar Análisis Igualmente" },
            { id: "btn-news-again", text: "Otro Desafío" }
        ]);
      }
    } else {
        if (newsChallengeState && newsChallengeState.selectionMessageId) {
             const selectionMessage = messages.find(msg => msg.id === newsChallengeState.selectionMessageId);
             if (selectionMessage && !selectionMessage.buttonsDisabled) {
                 addBotResponse("Elige una de las noticias con los botones antes de escribir, por favor.", [], 0);
                 setIsBotTyping(false);
                 return;
             }
        }
        const currentSystemPrompt = isFreeChatMode ? SYSTEM_PROMPT_FREE_CHAT : SYSTEM_PROMPT_FAKE_NEWS;
        const targetEndpoint = isFreeChatMode ? `/api/bot/chatlibre` : `/api/bot/chat`;

        const messagesForOllama: OllamaMessage[] = [{ role: 'system', content: currentSystemPrompt }];
        const messagesWithNewUser = [...messages, newUserMessage];
        messagesWithNewUser.forEach(msg => {
            if (msg.text && !msg.htmlContent && !msg.interactiveContent) {
                 if (!(newsChallengeState && msg.id === newsChallengeState.selectionMessageId && !msg.buttonsDisabled)) {
                    messagesForOllama.push({ role: msg.sender === 'user' ? 'user' : 'assistant', content: msg.text });
                }
            }
        });

        try {
            const apiResponse = await fetch(targetEndpoint, {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' },
                body: JSON.stringify({ messages: messagesForOllama, model: 'gemma3:4b' })
            });
            if (!apiResponse.ok) {
                setIsBotTyping(false);
                const errData = await apiResponse.json().catch(() => ({})); throw new Error(errData.detail || `API Error ${apiResponse.status}`);
            }
            const data = await apiResponse.json();
            addBotResponse(data.reply, [], 300);

            if (!isFreeChatMode) {
                addBotResponse(
                    "Puedes seguir preguntando o:",
                    [
                        { id: "btn-news-again", text: "Ir a Otro Desafío" },
                        { id: "btn-tips-again", text: "Ver tips" },
                    ],
                    500
                );
            }
        } catch (error) {
            setIsBotTyping(false);
            console.error(`Error sending message via ${targetEndpoint}:`, error);
            addBotResponse(`Lo siento, hubo un problema: ${error instanceof Error ? error.message : 'Desconocido'}`, [], 100);
        }
    }
  };

  // Comentario encima de la función handlePostTestCompleted
  const handlePostTestCompleted = useCallback(async (score: number, aciertos: number, totalQuestions: number) => {
    addBotResponse(
      `¡Terminaste tu evaluación de progreso! 🎉 Tu puntuación fue: **${score.toFixed(2)}%** (${aciertos} de ${totalQuestions} aciertos). ` +
      (score >= 70 ? "¡Excelente trabajo! Has aprendido mucho." : "¡Buen esfuerzo! Sigue practicando y verás cómo mejoras cada día."),
      [],
      300
    );
    addBotResponse(
        "¿Qué te gustaría hacer ahora?",
        [
            { id: "btn-news", text: "Más Desafíos de Noticias" },
            { id: "btn-tips", text: "Repasar Tips" },
            { id: "btn-talk", text: "Sólo Charlar" }
        ],
        600
    );
    setIsPostTestMode(false);
    await fetchUserInfo();
  }, [addBotResponse, fetchUserInfo]);

  // Comentario encima de la función startPostTest
  const startPostTest = useCallback(() => {
    if (currentUserInfo && (currentUserInfo.puntuacion_pre_test_total === null || currentUserInfo.puntuacion_pre_test_total === undefined)) {
        addBotResponse("Para evaluar tu progreso, primero necesitas completar un pequeño test inicial. Si no lo has hecho y quieres hacerlo, pregúntame por el 'pre-test'.", [], 300);
        return;
    }
    if (currentUserInfo && currentUserInfo.puntuacion_post_test_total !== null && currentUserInfo.puntuacion_post_test_total !== undefined){
        addBotResponse(`¡Genial! Parece que ya completaste tu evaluación de progreso. Tu puntuación fue: **${currentUserInfo.puntuacion_post_test_total.toFixed(2)}%**. ¿Listo para más desafíos o aprender algo nuevo?`, [], 300);
        return;
    }
    console.log("Iniciando Post-Test desde ChatContainer");
    const welcomeMsg = messages.find(msg => msg.id.toString().startsWith("welcome-msg"));
    setMessages(welcomeMsg ? [welcomeMsg] : []);

    setIsPostTestMode(true);
    setIsFreeChatMode(false);
    resetSingleAnalysisMode();
    setNewsChallengeState(null);
    setIsTipChallengeActive(false);
  }, [currentUserInfo, messages, addBotResponse, resetSingleAnalysisMode, setMessages, setIsPostTestMode, setIsFreeChatMode, setNewsChallengeState, setIsTipChallengeActive]);

  // Comentario encima de la función handleRefresh
  const handleRefresh = () => {
    if (isPostTestMode) {
        setIsPostTestMode(false);
    }
    if (!isLoadingUserInfo && currentUserInfo) {
      const welcomeMessage = createWelcomeMessage();
      const initialButtonsMessage: ChatMessage = {
        id: "buttons-msg-" + Date.now(), sender: "bot", text: "¿Cómo empezamos?", avatar: BOT_AVATAR_URL, timestamp: Date.now() + 1,
        buttons: [ { id: "btn-tips", text: "TIPS Y CONSEJOS" }, { id: "btn-news", text: "DESCIFRAR NOTICIAS" }, { id: "btn-talk", text: "SÓLO CHARLAR" } ],
        buttonsDisabled: false,
      };
      setIsFreeChatMode(false);
      setMessages([welcomeMessage, initialButtonsMessage]);
      setNewsChallengeState(null);
      resetSingleAnalysisMode();
      setDifficultyLevel('bajo');
      setCorrectStreak(0);
      setIncorrectStreak(0);
      setGuidedAnalysesSubmitted(0);
      setIsTipChallengeActive(false);
    } else if (!authToken) {
        onLogout();
    }
    closePanel(); // closePanel ahora resetea selectedTermForSidePanel e initialPanelSection
  };

  let determinedChatInputDisabled = isLoadingNews || isBotTyping || isPostTestMode || isTipChallengeActive;
  if (!isPostTestMode && !isTipChallengeActive && !determinedChatInputDisabled) {
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    const hasStrictlyExclusiveChoiceButtons =
        lastMessage?.sender === 'bot' &&
        lastMessage.buttons &&
        lastMessage.buttons.length > 0 &&
        !lastMessage.buttonsDisabled &&
        lastMessage.buttons.every(btn =>
            btn.id === "btn-tips" || btn.id === "btn-news" || btn.id === "btn-talk" ||
            btn.id === "btn-repeat-tips-yes" || btn.id === "btn-tip-understood" ||
            btn.id.startsWith("select-news-")
        );

    if (isSingleNewsAnalysisMode) {
      if (isAwaitingInitialAnalysis) determinedChatInputDisabled = false;
      else if (currentGuidedChatSessionId) determinedChatInputDisabled = false;
      else determinedChatInputDisabled = true;
    } else if (hasStrictlyExclusiveChoiceButtons) {
      determinedChatInputDisabled = true;
    } else {
      determinedChatInputDisabled = false;
    }
  }


  return (
    <div className="chat-container">
      <ChatHeader
        nickname={currentUserInfo?.apodo || 'Usuario'}
        onPanelToggle={togglePanel}
        onRefresh={isPostTestMode ? () => { alert("No puedes refrescar durante la evaluación."); } : handleRefresh}
      />

      {isPostTestMode ? (
        <PostTestFlow
          authToken={authToken}
          onTestComplete={handlePostTestCompleted}
          onCancelTest={() => {
            setIsPostTestMode(false);
            const welcomeMsg = messages.find(msg => msg.id.toString().startsWith("welcome-msg"));
            const initialButtonsMessage: ChatMessage = {
                id: "buttons-msg-" + Date.now() +'-cancel', sender: "bot", text: "¿Qué te gustaría hacer ahora?", avatar: BOT_AVATAR_URL, timestamp: Date.now() + 1,
                buttons: [
                  { id: "btn-tips", text: "TIPS Y CONSEJOS" },
                  { id: "btn-news", text: "DESCIFRAR NOTICIAS" },
                  { id: "btn-talk", text: "SÓLO CHARLAR" }, ],
                buttonsDisabled: false,
              };
            setMessages(welcomeMsg ? [welcomeMsg, initialButtonsMessage] : [initialButtonsMessage]);
          }}
        />
      ) : (
        <>
          {chatError && (isLoadingNews || isSingleNewsAnalysisMode) && ( <div style={{ padding: '5px', background: '#fff0f0', color: 'red', textAlign: 'center' }}>Error: {chatError}</div> )}
          <MessageList
            messages={messages}
            onButtonClick={handleMessageButtonClick}
            isBotTyping={isBotTyping}
            botAvatarUrl={BOT_AVATAR_URL}
          />
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={determinedChatInputDisabled}
          />
        </>
      )}

      <SidePanel
        isOpen={isPanelOpen}
        onClose={closePanel}
        userInfo={currentUserInfo}
        authToken={authToken}
        onLogout={onLogout}
        onSettingsSaved={handleSettingsSaved}
        onStartPostTest={startPostTest}
        selectedTerm={selectedTermForSidePanel} // <--- PASA LA PROP
        initialSection={initialPanelSection}   // <--- PASA LA PROP
      />
    </div>
  );
}
export default ChatContainer;
