/**
 * Aparência dos pontos de conexão, num lugar só.
 *
 * Antes cada card escrevia a própria classe, e as duas cópias tinham o mesmo
 * defeito: `opacity-0` até o group-hover, num alvo de 10px. Para ligar dois
 * nós era preciso adivinhar onde estava o ponto, acertar o hover no card certo
 * e então mirar num alvo invisível — na prática, ninguém conseguia.
 *
 * Agora o ponto fica sempre visível, discreto, e ganha destaque quando o mouse
 * chega perto. O alvo de clique é maior que o desenho: o ::after estende a área
 * sensível para 28px sem engordar o ponto na tela.
 */

const BASE =
  '!h-3.5 !w-3.5 !rounded-full !border-2 !border-background transition-all duration-200 ' +
  "after:absolute after:-inset-[7px] after:content-[''] " +
  'hover:!scale-[1.6] hover:!border-primary'

/** Ponto de anotação: liga qualquer coisa a qualquer coisa, em qualquer direção. */
export const LINK_HANDLE = `${BASE} !bg-muted-foreground opacity-40 group-hover:opacity-100`

/** Ponto estrutural: define pai e filho na árvore. Herda a cor do nível. */
export const STRUCTURAL_HANDLE = `${BASE} !border-background opacity-70 group-hover:opacity-100`
