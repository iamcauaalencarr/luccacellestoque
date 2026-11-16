const ARQUIVO_APPLE_CDN_BASE =
  'https://cdn.jsdelivr.net/gh/iamcauaalencarr/ArquivoApple@main/';
const ARQUIVO_APPLE_RAW_BASE =
  'https://raw.githubusercontent.com/iamcauaalencarr/ArquivoApple/main/';

type RawColorTuple = readonly [name: string, hex: string, imagePath: string];

interface RawIphoneModelEntry {
  model: string;
  colors: readonly RawColorTuple[];
}

const RAW_IPHONE_CATALOG: readonly RawIphoneModelEntry[] = [
  { model: 'iPhone 18 Pro Max', colors: [['Black', '#3C3C3C', 'iphones/iphone-18-pro-max/black/imagem.png'], ['Burgundy', '#4D1822', 'iphones/iphone-18-pro-max/burgundy/imagem.png'], ['Glacier', '#E8F2FE', 'iphones/iphone-18-pro-max/glacier/imagem.png'], ['Silver', '#F7F7F7', 'iphones/iphone-18-pro-max/silver/imagem.png']] },
  { model: 'iPhone 18 Pro', colors: [['Black', '#3C3C3C', 'iphones/iphone-18-pro/black/imagem.png'], ['Burgundy', '#4D1822', 'iphones/iphone-18-pro/burgundy/imagem.png'], ['Glacier', '#E8F2FE', 'iphones/iphone-18-pro/glacier/imagem.png'], ['Silver', '#F7F7F7', 'iphones/iphone-18-pro/silver/imagem.png']] },
  { model: 'iPhone 17e', colors: [['Black', '#404040', 'iphones/iphone-17e/black/produto.jpg'], ['Soft Pink', '#FCE7E6', 'iphones/iphone-17e/soft-pink/produto.jpg'], ['White', '#F6F6F4', 'iphones/iphone-17e/white/produto.jpg']] },
  { model: 'iPhone 17 Pro Max', colors: [['Cosmic Orange', '#F8833E', 'iphones/iphone-17-pro-max/cosmic-orange/produto.jpg'], ['Deep Blue', '#4A5680', 'iphones/iphone-17-pro-max/deep-blue/produto.jpg'], ['Silver', '#E7E7E7', 'iphones/iphone-17-pro-max/silver/produto.jpg']] },
  { model: 'iPhone 17 Pro', colors: [['Cosmic Orange', '#F8833E', 'iphones/iphone-17-pro/cosmic-orange/produto.jpg'], ['Deep Blue', '#4A5680', 'iphones/iphone-17-pro/deep-blue/produto.jpg'], ['Silver', '#E7E7E7', 'iphones/iphone-17-pro/silver/produto.jpg']] },
  { model: 'iPhone 17', colors: [['Black', '#464747', 'iphones/iphone-17/black/produto.jpg'], ['Lavender', '#E7D7F2', 'iphones/iphone-17/lavender/produto.jpg'], ['Mist Blue', '#A6BDDD', 'iphones/iphone-17/mist-blue/produto.jpg'], ['Sage', '#BAC79C', 'iphones/iphone-17/sage/produto.jpg'], ['White', '#F7F7F5', 'iphones/iphone-17/white/produto.jpg']] },
  { model: 'iPhone Air', colors: [['Cloud White', '#FCFCFC', 'iphones/iphone-air/cloud-white/imagem.png'], ['Light Gold', '#FAF2E5', 'iphones/iphone-air/light-gold/produto.jpg'], ['Sky Blue', '#E5F2FA', 'iphones/iphone-air/sky-blue/produto.jpg'], ['Space Black', '#0E0E0E', 'iphones/iphone-air/space-black/produto.jpg']] },
  { model: 'iPhone Duo', colors: [['Night Sky', '#394452', 'iphones/iphone-duo/night-sky/imagem.png'], ['Star White', '#F7F6F5', 'iphones/iphone-duo/star-white/imagem.png']] },
  { model: 'iPhone 16e', colors: [['Black', '#404040', 'iphones/iphone-16e/black/produto.jpg'], ['White', '#F6F6F4', 'iphones/iphone-16e/white/produto.jpg']] },
  { model: 'iPhone 16 Pro Max', colors: [['Black Titanium', '#4F4F4F', 'iphones/iphone-16-pro-max/black-titanium/produto.jpg'], ['Desert Titanium', '#EBD8C8', 'iphones/iphone-16-pro-max/desert-titanium/produto.jpg'], ['Natural Titanium', '#CBC7C0', 'iphones/iphone-16-pro-max/natural-titanium/produto.jpg'], ['White Titanium', '#ECECEA', 'iphones/iphone-16-pro-max/white-titanium/produto.jpg']] },
  { model: 'iPhone 16 Pro', colors: [['Black Titanium', '#4F4F4F', 'iphones/iphone-16-pro/black-titanium/produto.jpg'], ['Desert Titanium', '#EBD8C8', 'iphones/iphone-16-pro/desert-titanium/produto.jpg'], ['Natural Titanium', '#CBC7C0', 'iphones/iphone-16-pro/natural-titanium/produto.jpg'], ['White Titanium', '#ECECEA', 'iphones/iphone-16-pro/white-titanium/produto.jpg']] },
  { model: 'iPhone 16 Plus', colors: [['Black', '#464747', 'iphones/iphone-16-plus/black/produto.jpg'], ['Pink', '#F1A8D8', 'iphones/iphone-16-plus/pink/produto.jpg'], ['Teal', '#AFD4D2', 'iphones/iphone-16-plus/teal/produto.jpg'], ['Ultramarine', '#94A6F1', 'iphones/iphone-16-plus/ultramarine/produto.jpg'], ['White', '#F7F7F5', 'iphones/iphone-16-plus/white/produto.jpg']] },
  { model: 'iPhone 16', colors: [['Black', '#464747', 'iphones/iphone-16/black/produto.jpg'], ['Pink', '#F1A8D8', 'iphones/iphone-16/pink/produto.jpg'], ['Teal', '#AFD4D2', 'iphones/iphone-16/teal/produto.jpg'], ['Ultramarine', '#94A6F1', 'iphones/iphone-16/ultramarine/produto.jpg'], ['White', '#F7F7F5', 'iphones/iphone-16/white/produto.jpg']] },
  { model: 'iPhone 15 Pro Max', colors: [['Black Titanium', '#464646', 'iphones/iphone-15-pro-max/black-titanium/produto.jpg'], ['Blue Titanium', '#545A66', 'iphones/iphone-15-pro-max/blue-titanium/produto.jpg'], ['Natural Titanium', '#A6A29B', 'iphones/iphone-15-pro-max/natural-titanium/produto.jpg'], ['White Titanium', '#EEEAE6', 'iphones/iphone-15-pro-max/white-titanium/produto.jpg']] },
  { model: 'iPhone 15 Pro', colors: [['Black Titanium', '#464646', 'iphones/iphone-15-pro/black-titanium/produto.jpg'], ['Blue Titanium', '#545A66', 'iphones/iphone-15-pro/blue-titanium/produto.jpg'], ['Natural Titanium', '#A6A29B', 'iphones/iphone-15-pro/natural-titanium/produto.jpg'], ['White Titanium', '#EEEAE6', 'iphones/iphone-15-pro/white-titanium/produto.jpg']] },
  { model: 'iPhone 15 Plus', colors: [['Black', '#4E4F4E', 'iphones/iphone-15-plus/black/produto.jpg'], ['Blue', '#F3F8F8', 'iphones/iphone-15-plus/blue/produto.jpg'], ['Green', '#F3F8E8', 'iphones/iphone-15-plus/green/produto.jpg'], ['Pink', '#FCE8E8', 'iphones/iphone-15-plus/pink/produto.jpg'], ['Yellow', '#FCFBE4', 'iphones/iphone-15-plus/yellow/produto.jpg']] },
  { model: 'iPhone 15', colors: [['Black', '#4E4F4E', 'iphones/iphone-15/black/produto.jpg'], ['Blue', '#F3F8F8', 'iphones/iphone-15/blue/produto.jpg'], ['Green', '#F3F8E8', 'iphones/iphone-15/green/produto.jpg'], ['Pink', '#FCE8E8', 'iphones/iphone-15/pink/produto.jpg'], ['Yellow', '#FCFBE4', 'iphones/iphone-15/yellow/produto.jpg']] },
  { model: 'iPhone 14 Pro Max', colors: [['Deep Purple', '#595261', 'iphones/iphone-14-pro-max/deep-purple/produto.jpg'], ['Gold', '#F3E6CC', 'iphones/iphone-14-pro-max/gold/produto.jpg'], ['Silver', '#F0F2F2', 'iphones/iphone-14-pro-max/silver/produto.jpg'], ['Space Black', '#3B3937', 'iphones/iphone-14-pro-max/space-black/produto.jpg']] },
  { model: 'iPhone 14 Pro', colors: [['Deep Purple', '#595261', 'iphones/iphone-14-pro/deep-purple/produto.jpg'], ['Gold', '#F3E6CC', 'iphones/iphone-14-pro/gold/produto.jpg'], ['Silver', '#F0F2F2', 'iphones/iphone-14-pro/silver/produto.jpg'], ['Space Black', '#3B3937', 'iphones/iphone-14-pro/space-black/produto.jpg']] },
  { model: 'iPhone 14 Plus', colors: [['Blue', '#A8B8C8', 'iphones/iphone-14-plus/blue/produto.jpg'], ['Midnight', '#192928', 'iphones/iphone-14-plus/midnight/produto.jpg'], ['(PRODUCT)RED', '#F80628', 'iphones/iphone-14-plus/product-red/produto.jpg'], ['Purple', '#E8D8E8', 'iphones/iphone-14-plus/purple/produto.jpg'], ['Starlight', '#F8F8E7', 'iphones/iphone-14-plus/starlight/produto.jpg'], ['Yellow', '#F8D868', 'iphones/iphone-14-plus/yellow/produto.jpg']] },
  { model: 'iPhone 14', colors: [['Blue', '#A8B8C8', 'iphones/iphone-14/blue/produto.jpg'], ['Midnight', '#192928', 'iphones/iphone-14/midnight/produto.jpg'], ['(PRODUCT)RED', '#F80628', 'iphones/iphone-14/product-red/produto.jpg'], ['Purple', '#E8D8E8', 'iphones/iphone-14/purple/produto.jpg'], ['Starlight', '#F8F8E7', 'iphones/iphone-14/starlight/produto.jpg'], ['Yellow', '#F8D868', 'iphones/iphone-14/yellow/produto.jpg']] },
  { model: 'iPhone SE (3rd generation)', colors: [['Midnight', '#161E24', 'iphones/iphone-se-3rd-generation/midnight/produto.jpg'], ['(PRODUCT)RED', '#A10415', 'iphones/iphone-se-3rd-generation/product-red/produto.jpg'], ['Starlight', '#F7F2EE', 'iphones/iphone-se-3rd-generation/starlight/produto.jpg']] },
  { model: 'iPhone 13 Pro Max', colors: [['Alpine Green', '#546554', 'iphones/iphone-13-pro-max/alpine-green/produto.jpg'], ['Gold', '#F6E4C7', 'iphones/iphone-13-pro-max/gold/produto.jpg'], ['Graphite', '#4C4C4A', 'iphones/iphone-13-pro-max/graphite/produto.jpg'], ['Sierra Blue', '#93A9C0', 'iphones/iphone-13-pro-max/sierra-blue/produto.jpg'], ['Silver', '#F1F1E7', 'iphones/iphone-13-pro-max/silver/produto.jpg']] },
  { model: 'iPhone 13 Pro', colors: [['Alpine Green', '#546554', 'iphones/iphone-13-pro/alpine-green/produto.jpg'], ['Gold', '#F6E4C7', 'iphones/iphone-13-pro/gold/produto.jpg'], ['Graphite', '#4C4C4A', 'iphones/iphone-13-pro/graphite/produto.jpg'], ['Sierra Blue', '#93A9C0', 'iphones/iphone-13-pro/sierra-blue/produto.jpg'], ['Silver', '#F1F1E7', 'iphones/iphone-13-pro/silver/produto.jpg']] },
  { model: 'iPhone 13 mini', colors: [['Blue', '#235D7B', 'iphones/iphone-13-mini/blue/produto.jpg'], ['Green', '#334434', 'iphones/iphone-13-mini/green/produto.jpg'], ['Midnight', '#151D23', 'iphones/iphone-13-mini/midnight/produto.jpg'], ['Pink', '#FCDDD8', 'iphones/iphone-13-mini/pink/produto.jpg'], ['(PRODUCT)RED', '#96060D', 'iphones/iphone-13-mini/product-red/produto.jpg'], ['Starlight', '#F9F4EE', 'iphones/iphone-13-mini/starlight/produto.jpg']] },
  { model: 'iPhone 13', colors: [['Blue', '#235D7B', 'iphones/iphone-13/blue/produto.jpg'], ['Green', '#334434', 'iphones/iphone-13/green/produto.jpg'], ['Midnight', '#151D23', 'iphones/iphone-13/midnight/produto.jpg'], ['Pink', '#FCDDD8', 'iphones/iphone-13/pink/produto.jpg'], ['(PRODUCT)RED', '#96060D', 'iphones/iphone-13/product-red/produto.jpg'], ['Starlight', '#F9F4EE', 'iphones/iphone-13/starlight/produto.jpg']] },
  { model: 'iPhone 12 Pro Max', colors: [['Gold', '#FCEFD9', 'iphones/iphone-12-pro-max/gold/produto.jpg'], ['Graphite', '#494846', 'iphones/iphone-12-pro-max/graphite/produto.jpg'], ['Pacific Blue', '#304B55', 'iphones/iphone-12-pro-max/pacific-blue/produto.jpg'], ['Silver', '#F3F4F0', 'iphones/iphone-12-pro-max/silver/produto.jpg']] },
  { model: 'iPhone 12 Pro', colors: [['Gold', '#FCEFD9', 'iphones/iphone-12-pro/gold/produto.jpg'], ['Graphite', '#494846', 'iphones/iphone-12-pro/graphite/produto.jpg'], ['Pacific Blue', '#304B55', 'iphones/iphone-12-pro/pacific-blue/produto.jpg'], ['Silver', '#F3F4F0', 'iphones/iphone-12-pro/silver/produto.jpg']] },
  { model: 'iPhone 12 mini', colors: [['Black', '#221C24', 'iphones/iphone-12-mini/black/produto.jpg'], ['Blue', '#033356', 'iphones/iphone-12-mini/blue/produto.jpg'], ['Green', '#DDF4D8', 'iphones/iphone-12-mini/green/produto.jpg'], ['(PRODUCT)RED', '#DF3434', 'iphones/iphone-12-mini/product-red/produto.jpg'], ['Purple', '#AFA9DF', 'iphones/iphone-12-mini/purple/produto.jpg'], ['White', '#FDF4F4', 'iphones/iphone-12-mini/white/produto.jpg']] },
  { model: 'iPhone 12', colors: [['Black', '#221C24', 'iphones/iphone-12/black/produto.jpg'], ['Blue', '#033356', 'iphones/iphone-12/blue/produto.jpg'], ['Green', '#DDF4D8', 'iphones/iphone-12/green/produto.jpg'], ['(PRODUCT)RED', '#DF3434', 'iphones/iphone-12/product-red/produto.jpg'], ['Purple', '#AFA9DF', 'iphones/iphone-12/purple/produto.jpg'], ['White', '#FDF4F4', 'iphones/iphone-12/white/produto.jpg']] },
  { model: 'iPhone SE (2nd generation)', colors: [['Black', '#1D1D1F', 'iphones/iphone-se-2nd-generation/black/produto.jpg'], ['(PRODUCT)RED', '#AF0125', 'iphones/iphone-se-2nd-generation/product-red/produto.jpg'], ['White', '#F1F1F1', 'iphones/iphone-se-2nd-generation/white/produto.jpg']] },
  { model: 'iPhone 11 Pro Max', colors: [['Gold', '#F4D2B9', 'iphones/iphone-11-pro-max/gold/produto.jpg'], ['Midnight Green', '#414A46', 'iphones/iphone-11-pro-max/midnight-green/produto.jpg'], ['Silver', '#E0E0D8', 'iphones/iphone-11-pro-max/silver/produto.jpg'], ['Space Gray', '#3A3839', 'iphones/iphone-11-pro-max/space-gray/produto.jpg']] },
  { model: 'iPhone 11 Pro', colors: [['Gold', '#F4D2B9', 'iphones/iphone-11-pro/gold/produto.jpg'], ['Midnight Green', '#414A46', 'iphones/iphone-11-pro/midnight-green/produto.jpg'], ['Silver', '#E0E0D8', 'iphones/iphone-11-pro/silver/produto.jpg'], ['Space Gray', '#3A3839', 'iphones/iphone-11-pro/space-gray/produto.jpg']] },
  { model: 'iPhone 11', colors: [['Black', '#1E1E1E', 'iphones/iphone-11/black/produto.jpg'], ['Green', '#ABDDCA', 'iphones/iphone-11/green/produto.jpg'], ['(PRODUCT)RED', '#B6062A', 'iphones/iphone-11/product-red/produto.jpg'], ['Purple', '#D7D1E0', 'iphones/iphone-11/purple/produto.jpg'], ['White', '#FBF9F2', 'iphones/iphone-11/white/produto.jpg'], ['Yellow', '#FEE581', 'iphones/iphone-11/yellow/produto.jpg']] },
  { model: 'iPhone XR', colors: [['Black', '#212123', 'iphones/iphone-xr/black/produto.jpg'], ['Blue', '#45ACE7', 'iphones/iphone-xr/blue/produto.jpg'], ['Coral', '#FD624E', 'iphones/iphone-xr/coral/produto.jpg'], ['(PRODUCT)RED', '#9A0114', 'iphones/iphone-xr/product-red/produto.jpg'], ['White', '#F9F9F9', 'iphones/iphone-xr/white/produto.jpg'], ['Yellow', '#F7CF49', 'iphones/iphone-xr/yellow/produto.jpg']] },
  { model: 'iPhone XS Max', colors: [['Gold', '#FBDBC4', 'iphones/iphone-xs-max/gold/produto.jpg'], ['Silver', '#E4E4E2', 'iphones/iphone-xs-max/silver/produto.jpg'], ['Space Gray', '#222329', 'iphones/iphone-xs-max/space-gray/produto.jpg']] },
  { model: 'iPhone XS', colors: [['Gold', '#FBDBC4', 'iphones/iphone-xs/gold/produto.jpg'], ['Silver', '#E4E4E2', 'iphones/iphone-xs/silver/produto.jpg'], ['Space Gray', '#222329', 'iphones/iphone-xs/space-gray/produto.jpg']] },
  { model: 'iPhone X', colors: [['Silver', '#E3E3E1', 'iphones/iphone-x/silver/produto.jpg'], ['Space Gray', '#26272C', 'iphones/iphone-x/space-gray/produto.jpg']] },
  { model: 'iPhone 8 Plus', colors: [['Gold', '#F4E8DF', 'iphones/iphone-8-plus/gold/produto.jpg'], ['(PRODUCT)RED', '#BB0F30', 'iphones/iphone-8-plus/product-red/produto.jpg'], ['Silver', '#E9EAEC', 'iphones/iphone-8-plus/silver/produto.jpg'], ['Space Gray', '#262628', 'iphones/iphone-8-plus/space-gray/produto.jpg']] },
  { model: 'iPhone 8', colors: [['Gold', '#F4E8DF', 'iphones/iphone-8/gold/produto.jpg'], ['(PRODUCT)RED', '#BB0F30', 'iphones/iphone-8/product-red/produto.jpg'], ['Silver', '#E9EAEC', 'iphones/iphone-8/silver/produto.jpg'], ['Space Gray', '#262628', 'iphones/iphone-8/space-gray/produto.jpg']] },
  { model: 'iPhone 7 Plus', colors: [['Black', '#222326', 'iphones/iphone-7-plus/black/produto.jpg'], ['Gold', '#E8CEB7', 'iphones/iphone-7-plus/gold/produto.jpg'], ['Jet Black', '#000000', 'iphones/iphone-7-plus/jet-black/imagem.png'], ['(PRODUCT)RED', '#AE2531', 'iphones/iphone-7-plus/product-red/produto.jpg'], ['Rose Gold', '#E6BAB6', 'iphones/iphone-7-plus/rose-gold/produto.jpg'], ['Silver', '#CCCDCF', 'iphones/iphone-7-plus/silver/produto.jpg']] },
  { model: 'iPhone 7', colors: [['Black', '#222326', 'iphones/iphone-7/black/produto.jpg'], ['Gold', '#E8CEB7', 'iphones/iphone-7/gold/produto.jpg'], ['Jet Black', '#000000', 'iphones/iphone-7/jet-black/imagem.png'], ['(PRODUCT)RED', '#AE2531', 'iphones/iphone-7/product-red/produto.jpg'], ['Rose Gold', '#E6BAB6', 'iphones/iphone-7/rose-gold/produto.jpg'], ['Silver', '#CCCDCF', 'iphones/iphone-7/silver/produto.jpg']] },
  { model: 'iPhone SE (1st generation)', colors: [['Gold', '#DBC3AB', 'iphones/iphone-se-1st-generation/gold/produto.jpg'], ['Rose Gold', '#DDB3B0', 'iphones/iphone-se-1st-generation/rose-gold/produto.jpg'], ['Silver', '#CCCCCE', 'iphones/iphone-se-1st-generation/silver/produto.jpg'], ['Space Gray', '#9F9EA5', 'iphones/iphone-se-1st-generation/space-gray/produto.jpg']] },
  { model: 'iPhone 6s Plus', colors: [['Gold', '#DAC2AA', 'iphones/iphone-6s-plus/gold/produto.jpg'], ['Rose Gold', '#E2B7B2', 'iphones/iphone-6s-plus/rose-gold/produto.jpg'], ['Silver', '#D9D9DB', 'iphones/iphone-6s-plus/silver/produto.jpg'], ['Space Gray', '#A9AAAF', 'iphones/iphone-6s-plus/space-gray/produto.jpg']] },
  { model: 'iPhone 6s', colors: [['Gold', '#DAC2AA', 'iphones/iphone-6s/gold/produto.jpg'], ['Rose Gold', '#E2B7B2', 'iphones/iphone-6s/rose-gold/produto.jpg'], ['Silver', '#D9D9DB', 'iphones/iphone-6s/silver/produto.jpg'], ['Space Gray', '#A9AAAF', 'iphones/iphone-6s/space-gray/produto.jpg']] },
  { model: 'iPhone 6 Plus', colors: [['Gold', '#D5BEAA', 'iphones/iphone-6-plus/gold/produto.jpg'], ['Silver', '#DCDDDF', 'iphones/iphone-6-plus/silver/produto.jpg'], ['Space Gray', '#9D9EA3', 'iphones/iphone-6-plus/space-gray/produto.jpg']] },
  { model: 'iPhone 6', colors: [['Gold', '#D5BEAA', 'iphones/iphone-6/gold/produto.jpg'], ['Silver', '#DCDDDF', 'iphones/iphone-6/silver/produto.jpg'], ['Space Gray', '#9D9EA3', 'iphones/iphone-6/space-gray/produto.jpg']] },
  { model: 'iPhone 5s', colors: [['Gold', '#CDBCA8', 'iphones/iphone-5s/gold/produto.jpg'], ['Silver', '#C9CBCA', 'iphones/iphone-5s/silver/produto.jpg'], ['Space Gray', '#757577', 'iphones/iphone-5s/space-gray/produto.jpg']] },
  { model: 'iPhone 5c', colors: [['Blue', '#40B0EA', 'iphones/iphone-5c/blue/produto.jpg'], ['Green', '#98E467', 'iphones/iphone-5c/green/produto.jpg'], ['Pink', '#FF6C6C', 'iphones/iphone-5c/pink/produto.jpg'], ['White', '#F0F0F2', 'iphones/iphone-5c/white/produto.jpg'], ['Yellow', '#FFEF6F', 'iphones/iphone-5c/yellow/produto.jpg']] },
  { model: 'iPhone 5', colors: [['Black & Slate', '#273037', 'iphones/iphone-5/black-slate/imagem.jpg'], ['White & Silver', '#CBCDCC', 'iphones/iphone-5/white-silver/imagem.jpg']] },
  { model: 'iPhone 4s', colors: [['Black', '#000000', 'iphones/iphone-4s/black/produto.jpg'], ['White', '#EDEDED', 'iphones/iphone-4s/white/produto.jpg']] },
  { model: 'iPhone 4', colors: [['Black', '#000000', 'iphones/iphone-4/black/produto.jpg'], ['White', '#EBEBEB', 'iphones/iphone-4/white/produto.jpg']] },
  { model: 'iPhone 3GS', colors: [['Black', '#000000', 'iphones/iphone-3gs/black/imagem.jpg'], ['White', '#F1F1F3', 'iphones/iphone-3gs/white/imagem.jpg']] },
  { model: 'iPhone 3G', colors: [['Black', '#000000', 'iphones/iphone-3g/black/imagem.jpg'], ['White', '#F1F1F3', 'iphones/iphone-3g/white/imagem.jpg']] },
  { model: 'iPhone', colors: [['Black', '#B3B9BB', 'iphones/iphone/black/imagem.png']] },
];

const ENGLISH_TO_PT_COLOR: Record<string, string> = {
  '(product)red': 'Vermelho',
  'alpine green': 'Verde Alpino',
  black: 'Preto',
  'black & slate': 'Preto Ardósia',
  'black titanium': 'Titânio Preto',
  blue: 'Azul',
  'blue titanium': 'Titânio Azul',
  burgundy: 'Borgonha',
  'cloud white': 'Branco Nuvem',
  coral: 'Coral',
  'cosmic orange': 'Laranja Cósmico',
  'deep blue': 'Azul Profundo',
  'deep purple': 'Roxo Profundo',
  'desert titanium': 'Titânio Deserto',
  glacier: 'Geleira',
  gold: 'Dourado',
  graphite: 'Grafite',
  green: 'Verde',
  'jet black': 'Preto Brilhante',
  lavender: 'Lavanda',
  'light gold': 'Dourado Claro',
  midnight: 'Meia-Noite',
  'midnight green': 'Verde Meia-Noite',
  'mist blue': 'Azul Névoa',
  'natural titanium': 'Titânio Natural',
  'night sky': 'Céu Noturno',
  'pacific blue': 'Azul Pacífico',
  pink: 'Rosa',
  purple: 'Roxo',
  'rose gold': 'Ouro Rosa',
  sage: 'Sálvia',
  'sierra blue': 'Azul Sierra',
  silver: 'Prata',
  'sky blue': 'Azul Céu',
  'soft pink': 'Rosa Claro',
  'space black': 'Preto Espacial',
  'space gray': 'Cinza Espacial',
  'star white': 'Branco Estelar',
  starlight: 'Estelar',
  teal: 'Verde-Acinzentado',
  ultramarine: 'Ultramarino',
  white: 'Branco',
  'white & silver': 'Branco Prata',
  'white titanium': 'Titânio Branco',
  yellow: 'Amarelo',
};

// Portuguese/English color aliases ordered by most faithful Apple finish match
const COLOR_ALIAS_CANDIDATES: Record<string, readonly string[]> = {
  preto: ['black', 'black titanium', 'space black', 'midnight', 'jet black', 'space gray', 'black & slate'],
  'preto espacial': ['space black', 'black', 'black titanium', 'space gray'],
  'preto brilhante': ['jet black', 'black', 'space black'],
  'black piano': ['jet black', 'black'],
  'meia noite': ['midnight', 'black', 'space black'],
  branco: ['white', 'white titanium', 'starlight', 'cloud white', 'star white', 'silver', 'white & silver'],
  estelar: ['starlight', 'white', 'white titanium', 'cloud white'],
  'branco estelar': ['starlight', 'star white', 'white'],
  'branco nuvem': ['cloud white', 'white'],
  'titanio preto': ['black titanium', 'black', 'space black'],
  'preto titanio': ['black titanium', 'black', 'space black'],
  'titanio natural': ['natural titanium', 'silver', 'graphite'],
  natural: ['natural titanium', 'silver'],
  'titanio deserto': ['desert titanium', 'gold', 'light gold'],
  deserto: ['desert titanium', 'gold'],
  areia: ['desert titanium', 'gold'],
  'titanio branco': ['white titanium', 'white', 'silver', 'starlight'],
  'branco titanio': ['white titanium', 'white', 'silver'],
  'titanio azul': ['blue titanium', 'blue', 'deep blue'],
  'azul titanio': ['blue titanium', 'blue', 'deep blue'],
  verde: ['green', 'alpine green', 'midnight green', 'teal', 'sage'],
  'verde alpino': ['alpine green', 'green'],
  alpino: ['alpine green', 'green'],
  'verde meia noite': ['midnight green', 'green'],
  'verde escuro': ['midnight green', 'alpine green', 'green'],
  'verde acinzentado': ['teal', 'sage', 'green'],
  'verde agua': ['teal', 'green'],
  salvia: ['sage', 'green', 'teal'],
  azul: ['blue', 'ultramarine', 'sierra blue', 'pacific blue', 'blue titanium', 'deep blue', 'mist blue', 'sky blue'],
  'azul sierra': ['sierra blue', 'blue'],
  sierra: ['sierra blue'],
  'azul pacifico': ['pacific blue', 'blue'],
  pacifico: ['pacific blue'],
  'azul profundo': ['deep blue', 'pacific blue', 'blue'],
  'azul escuro': ['deep blue', 'pacific blue', 'blue titanium'],
  'azul nevoa': ['mist blue', 'sky blue', 'blue'],
  'azul claro': ['sky blue', 'mist blue', 'sierra blue', 'blue'],
  'azul ceu': ['sky blue', 'mist blue', 'blue'],
  ultramarino: ['ultramarine', 'blue'],
  rosa: ['pink', 'soft pink', 'rose gold'],
  'rosa claro': ['soft pink', 'pink'],
  'ouro rosa': ['rose gold', 'pink'],
  rose: ['rose gold', 'pink'],
  roxo: ['purple', 'deep purple', 'lavender'],
  'roxo profundo': ['deep purple', 'purple'],
  'roxo escuro': ['deep purple', 'purple'],
  lilas: ['lavender', 'purple'],
  lavanda: ['lavender', 'purple'],
  amarelo: ['yellow'],
  dourado: ['gold', 'light gold', 'desert titanium'],
  ouro: ['gold', 'light gold', 'desert titanium'],
  'dourado claro': ['light gold', 'gold'],
  prata: ['silver', 'white titanium', 'natural titanium'],
  prateado: ['silver', 'white titanium'],
  grafite: ['graphite', 'space gray', 'natural titanium', 'black titanium'],
  chumbo: ['graphite', 'space gray', 'black titanium'],
  'cinza espacial': ['space gray', 'graphite', 'natural titanium'],
  cinza: ['space gray', 'graphite', 'natural titanium'],
  vermelho: ['(product)red', 'burgundy'],
  red: ['(product)red'],
  'product red': ['(product)red'],
  coral: ['coral', 'cosmic orange'],
  laranja: ['cosmic orange', 'coral'],
  'laranja cosmico': ['cosmic orange', 'coral'],
  borgonha: ['burgundy', '(product)red'],
  vinho: ['burgundy'],
  geleira: ['glacier', 'sky blue', 'silver'],
  'ceu noturno': ['night sky', 'midnight', 'black'],
};

const FALLBACK_COLOR_HEX: Record<string, string> = {
  preto: '#262629',
  branco: '#F5F5F4',
  verde: '#4D6B53',
  azul: '#4A78A8',
  rosa: '#F2C1CE',
  roxo: '#7D6D8C',
  amarelo: '#F5DA73',
  dourado: '#E5CEAA',
  prata: '#E2E2DF',
  grafite: '#4C4C4A',
  vermelho: '#C9182B',
  laranja: '#F8833E',
  'titanio preto': '#4F4F4F',
  'titanio natural': '#C2BDB4',
  'titanio deserto': '#E2CBB5',
  'titanio branco': '#ECECE9',
  'titanio azul': '#545A66',
};

function normalizeText(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[()]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeModelQuery(rawModel: string): string {
  let norm = normalizeText(rawModel)
    .replace(/\bapple\b/g, ' ')
    .replace(/\biphone(\d)/g, 'iphone $1')
    .replace(/(\d)(pro|plus|mini|max|air|duo|pm)\b/g, '$1 $2')
    .replace(/\bpromax\b/g, 'pro max')
    .replace(/\bpm\b/g, 'pro max')
    .replace(/\b(anatel|lacrado|lacrada|seminovo|seminova|usado|novo|normal|5g|4g|esim|chip|fisico|dual|vitrine)\b/g, ' ')
    .replace(/\b\d+\s*(gb|tb)\b/g, ' ')
    .replace(/\b(64|128|256|512|1024)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (
    norm &&
    !norm.startsWith('iphone') &&
    (/^\d{1,2}(\s|$)/.test(norm) || /^(xr|xs|x|se|air|duo)(\s|$)/.test(norm))
  ) {
    norm = `iphone ${norm}`;
  }

  if (norm === 'iphone se' || norm === 'iphone se 3' || norm === 'iphone se 2022') {
    return 'iphone se 3rd generation';
  }
  if (norm === 'iphone se 2' || norm === 'iphone se 2020') {
    return 'iphone se 2nd generation';
  }
  if (norm === 'iphone se 1' || norm === 'iphone se 2016') {
    return 'iphone se 1st generation';
  }
  return norm;
}

const NORMALIZED_MODELS: Array<{
  normName: string;
  entry: RawIphoneModelEntry;
}> = RAW_IPHONE_CATALOG.map((entry) => ({
  normName: normalizeText(entry.model),
  entry,
})).sort((a, b) => b.normName.length - a.normName.length);

function findIphoneCatalogEntry(model: string): RawIphoneModelEntry | null {
  const query = normalizeModelQuery(model);
  if (!query || !query.includes('iphone')) return null;

  // 1. Exact normalized match
  const exact = NORMALIZED_MODELS.find((m) => m.normName === query);
  if (exact) return exact.entry;

  // 2. Prefix / containment match (ordered longest model name first so "iPhone 16 Pro Max" wins over "iPhone 16 Pro")
  const contained = NORMALIZED_MODELS.find(
    (m) => query.includes(m.normName) || (query.length >= 8 && m.normName.includes(query))
  );
  if (contained) return contained.entry;

  return null;
}

function matchColorInEntry(entry: RawIphoneModelEntry, rawColor?: string): RawColorTuple {
  if (!rawColor || !rawColor.trim()) return entry.colors[0];

  const normColor = normalizeText(rawColor);
  if (!normColor) return entry.colors[0];

  // 1. Direct match against English or PT-BR translated color name
  for (const tuple of entry.colors) {
    const enNorm = normalizeText(tuple[0]);
    const ptLabel = ENGLISH_TO_PT_COLOR[tuple[0].toLowerCase()] || tuple[0];
    const ptNorm = normalizeText(ptLabel);
    if (enNorm === normColor || ptNorm === normColor) {
      return tuple;
    }
  }

  // 2. Synonym / alias lookup
  const aliases = COLOR_ALIAS_CANDIDATES[normColor];
  if (aliases) {
    for (const candidate of aliases) {
      const candidateNorm = normalizeText(candidate);
      const found = entry.colors.find((tuple) => normalizeText(tuple[0]) === candidateNorm);
      if (found) return found;
    }
  }

  // 3. Token overlap scoring across English and Portuguese labels
  const queryTokens = normColor.split(' ').filter(Boolean);
  let bestScore = 0;
  let bestTuple: RawColorTuple | null = null;

  for (const tuple of entry.colors) {
    const enNorm = normalizeText(tuple[0]);
    const ptNorm = normalizeText(ENGLISH_TO_PT_COLOR[tuple[0].toLowerCase()] || tuple[0]);
    const targetTokens = new Set([...enNorm.split(' '), ...ptNorm.split(' ')]);

    let score = 0;
    for (const qt of queryTokens) {
      if (targetTokens.has(qt)) {
        score += 3;
      } else {
        const subCandidates = COLOR_ALIAS_CANDIDATES[qt];
        if (subCandidates) {
          for (let i = 0; i < subCandidates.length; i++) {
            const subNorm = normalizeText(subCandidates[i]);
            if (enNorm === subNorm || enNorm.includes(subNorm)) {
              score += Math.max(1, 2 - i * 0.2);
              break;
            }
          }
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestTuple = tuple;
    }
  }

  return bestTuple || entry.colors[0];
}

export interface ResolvedAppleImage {
  primaryUrl: string;
  fallbackUrl: string;
  hex: string;
  matchedModel: string;
  matchedColorPt: string;
}

export function resolveAppleDeviceImage(
  model: string,
  color?: string
): ResolvedAppleImage | null {
  const entry = findIphoneCatalogEntry(model);
  if (!entry) return null;

  const matched = matchColorInEntry(entry, color);
  const [enName, hex, imagePath] = matched;
  const ptName = ENGLISH_TO_PT_COLOR[enName.toLowerCase()] || enName;

  return {
    primaryUrl: `${ARQUIVO_APPLE_CDN_BASE}${imagePath}`,
    fallbackUrl: `${ARQUIVO_APPLE_RAW_BASE}${imagePath}`,
    hex,
    matchedModel: entry.model,
    matchedColorPt: ptName,
  };
}

export function getAppleModelColorSuggestions(
  model: string
): Array<{ label: string; hex: string }> {
  const entry = findIphoneCatalogEntry(model);
  if (!entry) return [];

  const seen = new Set<string>();
  const suggestions: Array<{ label: string; hex: string }> = [];
  for (const [enName, hex] of entry.colors) {
    const label = ENGLISH_TO_PT_COLOR[enName.toLowerCase()] || enName;
    if (!seen.has(label)) {
      seen.add(label);
      suggestions.push({ label, hex });
    }
  }
  return suggestions;
}

export function getAppleColorHex(color: string, model?: string): string | null {
  if (!color.trim()) return null;
  if (model) {
    const resolved = resolveAppleDeviceImage(model, color);
    if (resolved) {
      // Only return model-matched hex if the color actually resembles the matched color
      const normInput = normalizeText(color);
      const normMatched = normalizeText(resolved.matchedColorPt);
      const aliases = COLOR_ALIAS_CANDIDATES[normInput];
      if (
        normInput === normMatched ||
        normMatched.includes(normInput) ||
        normInput.includes(normMatched) ||
        Boolean(aliases)
      ) {
        return resolved.hex;
      }
    }
  }

  const norm = normalizeText(color);
  if (FALLBACK_COLOR_HEX[norm]) return FALLBACK_COLOR_HEX[norm];

  const aliases = COLOR_ALIAS_CANDIDATES[norm];
  if (aliases) {
    for (const candidate of aliases) {
      for (const entry of RAW_IPHONE_CATALOG) {
        const hit = entry.colors.find((c) => normalizeText(c[0]) === normalizeText(candidate));
        if (hit) return hit[1];
      }
    }
  }

  return null;
}
