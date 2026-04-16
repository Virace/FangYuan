import Key from "../i18nKey";
import type { Translation } from "../translation";

export const es: Translation = {
	[Key.home]: "Inicio",
	[Key.about]: "Sobre mí",
	[Key.archive]: "Archivo",
	[Key.search]: "Buscar",

	[Key.tags]: "Etiquetas",
	[Key.categories]: "Categorías",
	[Key.recentPosts]: "Publicaciones recientes",

	[Key.comments]: "Comentarios",
	[Key.commentsLoading]: "Cargando comentarios...",
	[Key.commentsEmpty]: "Aún no hay comentarios. Sé el primero en participar.",
	[Key.commentsDisabled]:
		"Los comentarios no están disponibles en este momento.",
	[Key.commentsLoadFailed]: "No se pudieron cargar los comentarios.",
	[Key.commentsSubmit]: "Publicar comentario",
	[Key.commentsSubmitting]: "Publicando...",
	[Key.commentsSubmitFailed]:
		"No se pudo enviar el comentario. Inténtalo de nuevo más tarde.",
	[Key.commentsSubmitSuccess]: "Comentario enviado correctamente.",
	[Key.commentsReply]: "Responder",
	[Key.commentsReplying]: "Respondiendo a este comentario.",
	[Key.commentsCancelReply]: "Cancelar respuesta",
	[Key.commentsEmoji]: "Emoji",
	[Key.commentsCaptcha]: "Captcha",
	[Key.commentsCaptchaRefresh]: "Actualizar captcha",
	[Key.commentsCaptchaVerify]: "Verificar captcha",
	[Key.commentsCaptchaVerified]:
		"Captcha verificado. Ya puedes comentar o votar.",
	[Key.commentsCaptchaRequiredTip]:
		"Artalk ahora requiere verificar el captcha. Complétalo aquí antes de volver a comentar o votar.",
	[Key.commentsCaptchaUnsupported]:
		"Este frontend todavía no admite el tipo de captcha actual.",
	[Key.commentsCaptchaVerifyFailed]:
		"La verificación del captcha falló. Inténtalo de nuevo.",
	[Key.commentsVoteUp]: "Voto positivo",
	[Key.commentsVoteDown]: "Voto negativo",
	[Key.commentsVoteFailed]:
		"No se pudo enviar el voto. Inténtalo de nuevo más tarde.",
	[Key.commentsSortNewest]: "Más recientes primero",
	[Key.commentsSortOldest]: "Más antiguos primero",
	[Key.commentsPaginationPrevious]: "Anterior",
	[Key.commentsPaginationNext]: "Siguiente",
	[Key.commentsPaginationStatus]: "Página",
	[Key.commentsModerationNotice]: "Pendiente de moderación",
	[Key.commentsFormName]: "Nombre",
	[Key.commentsFormEmail]: "Correo electrónico",
	[Key.commentsFormWebsite]: "Sitio web",
	[Key.commentsFormContent]: "Comentario",
	[Key.commentCountSingular]: "comentario",
	[Key.commentCountPlural]: "comentarios",
	[Key.commentsValidationNameRequired]: "Introduce un nombre.",
	[Key.commentsValidationEmailInvalid]:
		"Introduce una dirección de correo válida.",
	[Key.commentsValidationContentRequired]:
		"El contenido del comentario no puede estar vacío.",
	[Key.commentsValidationCaptchaRequired]: "Introduce el código del captcha.",
	[Key.commentsValidationContentUnsafe]:
		"El comentario contiene contenido sospechoso. Revísalo antes de enviarlo.",
	[Key.commentsValidationWebsiteInvalid]:
		"Introduce una URL de sitio web válida.",

	[Key.untitled]: "Sin título",
	[Key.uncategorized]: "Sin categoría",
	[Key.noTags]: "Sin etiquetas",

	[Key.wordCount]: "palabra",
	[Key.wordsCount]: "palabras",
	[Key.minuteCount]: "minuto",
	[Key.minutesCount]: "minutos",
	[Key.postCount]: "publicación",
	[Key.postsCount]: "publicaciones",

	[Key.themeColor]: "Color del tema",

	[Key.lightMode]: "Claro",
	[Key.darkMode]: "Oscuro",
	[Key.systemMode]: "Sistema",

	[Key.more]: "Más",

	[Key.author]: "Autor",
	[Key.publishedAt]: "Publicado el",
	[Key.pageViews]: "Vistas",
	[Key.license]: "Licencia",
};
