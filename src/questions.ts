import type { Lang } from './i18n';

export type Category = 'accounts' | 'devices' | 'scams';

/** Text in both languages. */
export type L = Record<Lang, string>;

export interface Option {
  id: string;
  label: L;
  /** Share of the question's weight this answer earns: 1 = fully protected, 0 = exposed. */
  credit: 0 | 0.5 | 1;
  /** When true, the answer means "I don't know": it earns 0 but the action is worded as "check". */
  unknown?: boolean;
}

export interface Action {
  title: L;
  why: L;
  how: L;
  /** Minutes the action takes. Used to total the high-priority time. */
  minutes: number;
}

export interface ChoiceQuestion {
  kind: 'choice';
  id: string;
  category: Category;
  /** 1 = low, 2 = medium, 3 = high. Decides both score weight and action priority. */
  weight: 1 | 2 | 3;
  title: L;
  help?: L;
  options: Option[];
  action: Action;
  /** Shown in "what is already fine" when the answer earns full credit. */
  done: L;
}

export interface PwnedQuestion {
  kind: 'pwned';
  id: string;
  category: 'accounts';
  weight: 2;
  title: L;
  action: Action;
  done: L;
}

export type Question = ChoiceQuestion | PwnedQuestion;

const yes: L = { pt: 'Sim', en: 'Yes' };
const no: L = { pt: 'Não', en: 'No' };
const dontKnow: L = { pt: 'Não sei', en: "I don't know" };

export const CATEGORY_ORDER: Category[] = ['accounts', 'devices', 'scams'];

export const QUESTIONS: Question[] = [
  // ---------------------------------------------------------------- Contas
  {
    kind: 'choice',
    id: 'email2fa',
    category: 'accounts',
    weight: 3,
    title: {
      pt: 'Seu e-mail principal tem a verificação em duas etapas ligada?',
      en: 'Does your main e-mail account have two-step verification turned on?',
    },
    help: {
      pt: 'É quando, além da senha, o e-mail pede um código no celular ou um toque no aviso "É você tentando entrar?". No Gmail fica em Conta Google › Segurança › Verificação em duas etapas.',
      en: 'That is when, besides the password, the e-mail asks for a code on your phone or a tap on the "Is it you trying to sign in?" prompt. In Gmail: Google Account › Security › 2-Step Verification.',
    },
    options: [
      { id: 'yes', label: { pt: 'Sim, está ligada', en: 'Yes, it is on' }, credit: 1 },
      { id: 'no', label: no, credit: 0 },
      { id: 'unknown', label: dontKnow, credit: 0, unknown: true },
    ],
    action: {
      title: { pt: 'Ligue a verificação em duas etapas no e-mail', en: 'Turn on two-step verification on your e-mail' },
      why: {
        pt: 'O e-mail recupera a senha de todo o resto: banco, redes sociais, WhatsApp. Quem entra nele entra em tudo.',
        en: 'Your e-mail resets the password of everything else: bank, social networks, WhatsApp. Whoever gets in gets everything.',
      },
      how: {
        pt: 'Conta Google › Segurança › Verificação em duas etapas › Ativar. Escolha o aviso no celular (ou o app Authenticator) e cadastre um telefone de recuperação. No Outlook/Hotmail: Segurança › Verificação em duas etapas.',
        en: 'Google Account › Security › 2-Step Verification › Turn on. Pick the phone prompt (or the Authenticator app) and add a recovery phone. Outlook/Hotmail: Security › Two-step verification.',
      },
      minutes: 10,
    },
    done: { pt: 'Verificação em duas etapas no e-mail', en: 'Two-step verification on e-mail' },
  },
  {
    kind: 'choice',
    id: 'manager',
    category: 'accounts',
    weight: 2,
    title: {
      pt: 'Como você guarda suas senhas?',
      en: 'How do you keep your passwords?',
    },
    help: {
      pt: 'Gerenciador de senhas é o cofre que cria e lembra senhas por você: o Gerenciador do Google, as Senhas do iPhone ou o Bitwarden.',
      en: 'A password manager is the vault that creates and remembers passwords for you: Google Password Manager, iPhone Passwords or Bitwarden.',
    },
    options: [
      { id: 'manager', label: { pt: 'Num gerenciador de senhas', en: 'In a password manager' }, credit: 1 },
      { id: 'paper', label: { pt: 'Num caderno ou papel guardado em casa', en: 'In a notebook kept at home' }, credit: 0.5 },
      { id: 'memory', label: { pt: 'De cabeça, ou numa nota do celular', en: 'In my head, or in a phone note' }, credit: 0 },
    ],
    action: {
      title: { pt: 'Passe a usar um gerenciador de senhas', en: 'Start using a password manager' },
      why: {
        pt: 'Senha de cabeça vira senha curta e repetida. Nota no celular é lida por qualquer app ou por quem pegar o aparelho. O gerenciador cria senhas longas e preenche sozinho.',
        en: 'Passwords kept in your head end up short and reused. A phone note can be read by any app or by whoever picks up the phone. A manager creates long passwords and fills them in for you.',
      },
      how: {
        pt: 'Android: Configurações › Google › Gerenciador de senhas e deixe "Salvar senhas" ligado. iPhone: app Senhas. Com os dois aparelhos: Bitwarden (gratuito). Comece pelas 3 que importam: e-mail, banco e WhatsApp/operadora.',
        en: 'Android: Settings › Google › Password Manager, keep "Save passwords" on. iPhone: the Passwords app. Both platforms: Bitwarden (free). Start with the 3 that matter: e-mail, bank and WhatsApp/carrier.',
      },
      minutes: 15,
    },
    done: { pt: 'Usa um gerenciador de senhas', en: 'Uses a password manager' },
  },
  {
    kind: 'choice',
    id: 'reuse',
    category: 'accounts',
    weight: 3,
    title: {
      pt: 'Você usa a mesma senha em mais de um lugar?',
      en: 'Do you use the same password in more than one place?',
    },
    help: {
      pt: 'Vale também a "mesma senha com um número diferente no final".',
      en: 'The "same password with a different number at the end" counts too.',
    },
    options: [
      { id: 'no', label: { pt: 'Não, cada conta tem a sua', en: 'No, each account has its own' }, credit: 1 },
      { id: 'some', label: { pt: 'Em algumas contas', en: 'In a few accounts' }, credit: 0.5 },
      { id: 'most', label: { pt: 'Na maioria, ou em todas', en: 'In most or all of them' }, credit: 0 },
    ],
    action: {
      title: { pt: 'Troque a senha repetida nas contas que importam', en: 'Change the reused password on the accounts that matter' },
      why: {
        pt: 'Quando um site vaza, criminosos testam a mesma senha no seu e-mail e no seu banco no mesmo dia, automaticamente.',
        en: 'When one site leaks, criminals try the same password on your e-mail and bank the same day, automatically.',
      },
      how: {
        pt: 'Troque primeiro no e-mail, depois no banco, depois no WhatsApp/operadora. Use uma frase longa que só você entende ("meu cachorro late às 6!") e deixe o gerenciador guardar.',
        en: 'Change it first on e-mail, then bank, then WhatsApp/carrier. Use a long phrase only you understand ("my dog barks at 6!") and let the manager keep it.',
      },
      minutes: 15,
    },
    done: { pt: 'Senha diferente em cada conta', en: 'A different password for each account' },
  },
  {
    kind: 'choice',
    id: 'recovery',
    category: 'accounts',
    weight: 1,
    title: {
      pt: 'O telefone e o e-mail de recuperação da sua conta principal estão atualizados?',
      en: 'Are the recovery phone and e-mail of your main account up to date?',
    },
    help: {
      pt: 'É o número e o e-mail que recebem o código quando você esquece a senha. Número antigo da operadora = conta perdida.',
      en: 'Those receive the code when you forget your password. An old phone number means a lost account.',
    },
    options: [
      { id: 'yes', label: yes, credit: 1 },
      { id: 'no', label: no, credit: 0 },
      { id: 'unknown', label: dontKnow, credit: 0, unknown: true },
    ],
    action: {
      title: { pt: 'Atualize o telefone e o e-mail de recuperação', en: 'Update the recovery phone and e-mail' },
      why: {
        pt: 'Sem recuperação atualizada, perder o celular ou esquecer a senha vira perder a conta inteira, com fotos e documentos.',
        en: 'Without current recovery options, losing the phone or forgetting the password means losing the whole account, photos and documents included.',
      },
      how: {
        pt: 'Conta Google › Segurança › Telefone de recuperação e E-mail de recuperação. Rode também a Verificação de segurança (myaccount.google.com/security-checkup) e tire aparelhos que você não usa mais.',
        en: 'Google Account › Security › Recovery phone and Recovery e-mail. Run the Security Checkup (myaccount.google.com/security-checkup) and remove devices you no longer use.',
      },
      minutes: 5,
    },
    done: { pt: 'Recuperação da conta atualizada', en: 'Account recovery up to date' },
  },
  {
    kind: 'pwned',
    id: 'pwned',
    category: 'accounts',
    weight: 2,
    title: {
      pt: 'Uma senha sua já apareceu em algum vazamento?',
      en: 'Has one of your passwords shown up in a data breach?',
    },
    action: {
      title: { pt: 'Troque a senha que apareceu em um vazamento', en: 'Change the password that showed up in a breach' },
      why: {
        pt: 'Ela está em listas públicas que criminosos testam em bancos e e-mails automaticamente.',
        en: 'It is on public lists that criminals try against banks and e-mail accounts automatically.',
      },
      how: {
        pt: 'Troque em todo lugar onde usa essa senha: primeiro no e-mail, depois no banco. Use uma frase longa e diferente em cada lugar.',
        en: 'Change it everywhere you use it: e-mail first, then bank. Use a long phrase, different for each account.',
      },
      minutes: 10,
    },
    done: { pt: 'Senha testada não aparece em vazamentos', en: 'Tested password not found in breaches' },
  },

  // ------------------------------------------------------------- Aparelhos
  {
    kind: 'choice',
    id: 'updates',
    category: 'devices',
    weight: 2,
    title: {
      pt: 'Seu celular instala as atualizações sozinho?',
      en: 'Does your phone install updates by itself?',
    },
    help: {
      pt: 'Atualização fecha as brechas que os golpes usam. Se aparece "atualização pendente" há semanas, a resposta é não.',
      en: 'Updates close the holes scams use. If "update pending" has been sitting there for weeks, the answer is no.',
    },
    options: [
      { id: 'yes', label: { pt: 'Sim, automático', en: 'Yes, automatically' }, credit: 1 },
      { id: 'manual', label: { pt: 'Eu instalo quando lembro', en: 'I install them when I remember' }, credit: 0.5 },
      { id: 'no', label: { pt: 'Não, ou não sei', en: "No, or I don't know" }, credit: 0, unknown: true },
    ],
    action: {
      title: { pt: 'Ligue a atualização automática', en: 'Turn on automatic updates' },
      why: {
        pt: 'A maioria dos ataques usa falhas que já foram corrigidas: quem não atualiza fica com a porta aberta.',
        en: 'Most attacks use flaws that have already been fixed: skipping updates leaves the door open.',
      },
      how: {
        pt: 'Android: Configurações › Sistema › Atualização do sistema, e na Play Store › Configurações › Atualizar apps automaticamente. iPhone: Ajustes › Geral › Atualização de Software › Atualizações Automáticas.',
        en: 'Android: Settings › System › System update, and Play Store › Settings › Auto-update apps. iPhone: Settings › General › Software Update › Automatic Updates.',
      },
      minutes: 5,
    },
    done: { pt: 'Atualizações automáticas ligadas', en: 'Automatic updates on' },
  },
  {
    kind: 'choice',
    id: 'lock',
    category: 'devices',
    weight: 3,
    title: {
      pt: 'Como o seu celular é desbloqueado?',
      en: 'How is your phone unlocked?',
    },
    options: [
      { id: 'bio', label: { pt: 'Digital, rosto ou senha de 6 números ou mais', en: 'Fingerprint, face or a PIN of 6+ digits' }, credit: 1 },
      { id: 'weak', label: { pt: 'Padrão de desenho ou senha de 4 números', en: 'A swipe pattern or a 4-digit PIN' }, credit: 0.5 },
      { id: 'none', label: { pt: 'Não tem bloqueio', en: 'No lock' }, credit: 0 },
    ],
    action: {
      title: { pt: 'Coloque bloqueio de tela com digital ou senha de 6 números', en: 'Set a screen lock with fingerprint or a 6-digit PIN' },
      why: {
        pt: 'Celular sem bloqueio nas mãos de um ladrão é banco, WhatsApp e e-mail abertos. O bloqueio também é o que liga a criptografia do aparelho.',
        en: 'An unlocked phone in a thief\'s hands is an open bank, WhatsApp and e-mail. The lock is also what turns on the device\'s encryption.',
      },
      how: {
        pt: 'Android: Configurações › Segurança › Bloqueio de tela › PIN de 6 números, depois Impressão digital. iPhone: Ajustes › Face ID e Código. Ligue também "Encontre meu dispositivo" para apagar de longe se roubarem.',
        en: 'Android: Settings › Security › Screen lock › 6-digit PIN, then Fingerprint. iPhone: Settings › Face ID & Passcode. Also turn on Find My Device so you can wipe it remotely if stolen.',
      },
      minutes: 5,
    },
    done: { pt: 'Bloqueio de tela forte', en: 'Strong screen lock' },
  },
  {
    kind: 'choice',
    id: 'encryption',
    category: 'devices',
    weight: 1,
    title: {
      pt: 'Seu computador tem a criptografia do disco ligada?',
      en: 'Is disk encryption turned on on your computer?',
    },
    help: {
      pt: 'No Windows chama BitLocker (ou "Criptografia do dispositivo"); no Mac, FileVault. Sem ela, quem levar o computador lê tudo, mesmo sem a sua senha.',
      en: 'On Windows it is BitLocker (or "Device encryption"); on Mac, FileVault. Without it, whoever takes the computer can read everything, even without your password.',
    },
    options: [
      { id: 'yes', label: yes, credit: 1 },
      { id: 'no', label: no, credit: 0 },
      { id: 'unknown', label: dontKnow, credit: 0, unknown: true },
      { id: 'nocomputer', label: { pt: 'Não uso computador', en: "I don't use a computer" }, credit: 1 },
    ],
    action: {
      title: { pt: 'Ligue a criptografia do disco do computador', en: 'Turn on disk encryption on your computer' },
      why: {
        pt: 'Notebook perdido ou roubado sem criptografia entrega documentos, fotos e senhas salvas no navegador.',
        en: 'A lost or stolen laptop without encryption hands over documents, photos and the passwords saved in the browser.',
      },
      how: {
        pt: 'Windows: Configurações › Privacidade e segurança › Criptografia do dispositivo (ou pesquise "BitLocker"); guarde a chave de recuperação na conta Microsoft. Mac: Ajustes do Sistema › Privacidade e Segurança › FileVault.',
        en: 'Windows: Settings › Privacy & security › Device encryption (or search "BitLocker"); save the recovery key to your Microsoft account. Mac: System Settings › Privacy & Security › FileVault.',
      },
      minutes: 10,
    },
    done: { pt: 'Disco do computador criptografado', en: 'Computer disk encrypted' },
  },
  {
    kind: 'choice',
    id: 'backup',
    category: 'devices',
    weight: 2,
    title: {
      pt: 'Suas fotos e arquivos têm backup automático?',
      en: 'Are your photos and files backed up automatically?',
    },
    help: {
      pt: 'Backup automático é o Google Fotos ou o iCloud copiando sozinhos, todo dia. Guardar só no celular não é backup.',
      en: 'Automatic backup means Google Photos or iCloud copying by themselves, every day. Keeping them only on the phone is not a backup.',
    },
    options: [
      { id: 'yes', label: { pt: 'Sim, sozinho, na nuvem', en: 'Yes, by itself, to the cloud' }, credit: 1 },
      { id: 'manual', label: { pt: 'Copio de vez em quando para o computador ou pen drive', en: 'I copy to a computer or USB stick now and then' }, credit: 0.5 },
      { id: 'no', label: { pt: 'Não, fica só no celular', en: 'No, it all stays on the phone' }, credit: 0 },
    ],
    action: {
      title: { pt: 'Ligue o backup automático das fotos e arquivos', en: 'Turn on automatic backup of photos and files' },
      why: {
        pt: 'Celular roubado, quebrado ou molhado não deveria levar as fotos da família junto.',
        en: 'A stolen, broken or wet phone should not take the family photos with it.',
      },
      how: {
        pt: 'Google Fotos › sua foto de perfil › Configurações › Backup › Ativar. iPhone: Ajustes › seu nome › iCloud › Fotos. Uma vez por mês, copie também para um computador ou HD.',
        en: 'Google Photos › your profile picture › Settings › Backup › Turn on. iPhone: Settings › your name › iCloud › Photos. Once a month, also copy to a computer or external drive.',
      },
      minutes: 5,
    },
    done: { pt: 'Backup automático das fotos', en: 'Automatic photo backup' },
  },

  // ---------------------------------------------------------------- Golpes
  {
    kind: 'choice',
    id: 'wapin',
    category: 'scams',
    weight: 3,
    title: {
      pt: 'Seu WhatsApp tem a confirmação em duas etapas (PIN de 6 números) ligada?',
      en: 'Does your WhatsApp have two-step verification (6-digit PIN) turned on?',
    },
    help: {
      pt: 'É o PIN que o WhatsApp pede de vez em quando ao abrir. Fica em Configurações › Conta › Confirmação em duas etapas.',
      en: 'It is the PIN WhatsApp asks for now and then when you open it. Settings › Account › Two-step verification.',
    },
    options: [
      { id: 'yes', label: { pt: 'Sim, está ligada', en: 'Yes, it is on' }, credit: 1 },
      { id: 'no', label: no, credit: 0 },
      { id: 'unknown', label: dontKnow, credit: 0, unknown: true },
    ],
    action: {
      title: { pt: 'Ative a confirmação em duas etapas no WhatsApp', en: 'Turn on two-step verification on WhatsApp' },
      why: {
        pt: 'Sem o PIN, quem receber o código de 6 dígitos por SMS consegue clonar seu WhatsApp e pedir dinheiro aos seus contatos. É o golpe mais comum no Brasil.',
        en: 'Without the PIN, whoever gets the 6-digit SMS code can clone your WhatsApp and ask your contacts for money. It is the most common scam in Brazil.',
      },
      how: {
        pt: 'WhatsApp › Configurações › Conta › Confirmação em duas etapas › Ativar. Escolha 6 números que não sejam sua data de nascimento e cadastre um e-mail de recuperação. Em Privacidade, deixe foto e "visto por último" só para "Meus contatos".',
        en: 'WhatsApp › Settings › Account › Two-step verification › Turn on. Pick 6 digits that are not your birthday and add a recovery e-mail. Under Privacy, set photo and "last seen" to "My contacts".',
      },
      minutes: 5,
    },
    done: { pt: 'WhatsApp com PIN de confirmação', en: 'WhatsApp with verification PIN' },
  },
  {
    kind: 'choice',
    id: 'quiz_son',
    category: 'scams',
    weight: 1,
    title: {
      pt: 'Chega esta mensagem de um número desconhecido: "Mãe, troquei de número, salva esse aqui. Tô precisando de um Pix urgente, depois te explico." O que é?',
      en: 'This message arrives from an unknown number: "Mom, I changed my number, save this one. I need an urgent transfer, I\'ll explain later." What is it?',
    },
    options: [
      { id: 'scam', label: { pt: 'Golpe: ligo para o número antigo do meu filho antes de qualquer coisa', en: 'A scam: I call my child\'s old number before doing anything' }, credit: 1 },
      { id: 'maybe', label: { pt: 'Pode ser verdade: pergunto algo que só ele saberia', en: 'Could be real: I ask something only they would know' }, credit: 0.5 },
      { id: 'real', label: { pt: 'Verdade: filho precisando, eu ajudo', en: 'Real: my child needs help, I help' }, credit: 0 },
    ],
    action: {
      title: { pt: 'Combine a regra do "número novo" com a família', en: 'Agree on the "new number" rule with your family' },
      why: {
        pt: 'O golpe do "filho com número novo" é o que mais tira dinheiro de pais e avós. Perguntas "que só ele saberia" muitas vezes são respondidas com o que está nas redes sociais.',
        en: 'The "child with a new number" scam is the one that takes the most money from parents and grandparents. "Only they would know" questions are often answered from social media.',
      },
      how: {
        pt: 'Regra única: mensagem de número novo pedindo dinheiro, desligue e ligue para o número que você já tem. Combine isso hoje no grupo da família.',
        en: 'One rule: a new number asking for money means you hang up and call the number you already have. Agree on it today in the family group.',
      },
      minutes: 5,
    },
    done: { pt: 'Reconhece o golpe do "número novo"', en: 'Spots the "new number" scam' },
  },
  {
    kind: 'choice',
    id: 'quiz_delivery',
    category: 'scams',
    weight: 1,
    title: {
      pt: 'SMS: "Correios: sua encomenda está retida. Pague a taxa de R$ 4,90 em correios-rastreio-br.com para liberar." O que é?',
      en: 'Text message: "Post office: your parcel is on hold. Pay the R$ 4.90 fee at correios-rastreio-br.com to release it." What is it?',
    },
    options: [
      { id: 'scam', label: { pt: 'Golpe: link falso, apago a mensagem', en: 'A scam: fake link, I delete the message' }, credit: 1 },
      { id: 'check', label: { pt: 'Abro o link só para olhar, sem pagar', en: 'I open the link just to look, without paying' }, credit: 0 },
      { id: 'pay', label: { pt: 'Pago, é pouco e eu estou esperando encomenda', en: 'I pay, it is cheap and I am expecting a parcel' }, credit: 0 },
    ],
    action: {
      title: { pt: 'Nunca abra link de cobrança que chega por SMS ou WhatsApp', en: 'Never open a payment link that arrives by text or WhatsApp' },
      why: {
        pt: 'A "taxa pequena" serve para pegar o cartão inteiro. Abrir o link já pode instalar algo no celular. Correios, banco e Receita não cobram por link.',
        en: 'The "small fee" is there to capture the whole card. Just opening the link can install something on the phone. Post offices, banks and tax agencies never charge through a link.',
      },
      how: {
        pt: 'Para conferir uma encomenda, abra o app ou o site oficial digitando o endereço você mesmo. Link de cobrança por mensagem: apague.',
        en: 'To check a parcel, open the official app or type the site address yourself. Payment link by message: delete it.',
      },
      minutes: 2,
    },
    done: { pt: 'Reconhece o golpe do link de cobrança', en: 'Spots the payment-link scam' },
  },
  {
    kind: 'choice',
    id: 'quiz_bank',
    category: 'scams',
    weight: 2,
    title: {
      pt: 'Alguém liga dizendo ser do banco: "Houve uma compra suspeita. Para cancelar, me confirme o código que acabou de chegar no seu celular." O que você faz?',
      en: 'Someone calls saying they are from the bank: "There was a suspicious purchase. To cancel it, read me the code that just arrived on your phone." What do you do?',
    },
    options: [
      { id: 'hangup', label: { pt: 'Desligo e ligo para o banco pelo número do cartão', en: 'I hang up and call the bank using the number on my card' }, credit: 1 },
      { id: 'verify', label: { pt: 'Passo o código se a pessoa souber meus dados', en: 'I give the code if the caller knows my details' }, credit: 0 },
      { id: 'unknown', label: dontKnow, credit: 0, unknown: true },
    ],
    action: {
      title: { pt: 'Nunca passe código recebido por SMS para ninguém', en: 'Never give a code received by text to anyone' },
      why: {
        pt: 'O código é a chave da sua conta: banco nenhum pede por telefone. Quem liga já tem seus dados porque vazaram; saber seu CPF não prova nada.',
        en: 'The code is the key to your account: no bank asks for it by phone. Callers already have your details from leaks; knowing them proves nothing.',
      },
      how: {
        pt: 'Regra: desliga e liga de volta pelo número impresso no cartão ou no app. Vale para banco, operadora, "suporte" e "Receita Federal".',
        en: 'Rule: hang up and call back using the number printed on your card or in the app. Applies to the bank, carrier, "support" and "tax office".',
      },
      minutes: 2,
    },
    done: { pt: 'Não passa código por telefone', en: 'Never gives a code over the phone' },
  },
  {
    kind: 'choice',
    id: 'quiz_photo',
    category: 'scams',
    weight: 1,
    title: {
      pt: 'Um contato manda: "Ganhei um prêmio e vou dividir com você, clica aqui pra receber", com um link. É mensagem de um amigo de verdade. O que é?',
      en: 'A contact sends: "I won a prize and I\'m sharing it with you, click here to get it", with a link. It really is a friend\'s account. What is it?',
    },
    options: [
      { id: 'scam', label: { pt: 'Golpe: o WhatsApp do amigo foi clonado, aviso por ligação', en: 'A scam: my friend\'s WhatsApp was cloned, I warn them by phone call' }, credit: 1 },
      { id: 'trust', label: { pt: 'Confio, é o número do meu amigo', en: 'I trust it, it is my friend\'s number' }, credit: 0 },
      { id: 'unknown', label: dontKnow, credit: 0, unknown: true },
    ],
    action: {
      title: { pt: 'Desconfie de link mesmo vindo de contato conhecido', en: 'Be wary of links even from known contacts' },
      why: {
        pt: 'Conta clonada manda mensagem para todos os contatos. O número ser do seu amigo não prova que foi ele quem escreveu.',
        en: 'A cloned account messages every contact. The number being your friend\'s does not prove they wrote it.',
      },
      how: {
        pt: 'Link inesperado, prêmio ou pedido de dinheiro: ligue para a pessoa antes de clicar. Se for clonagem, avise que ela reative o WhatsApp e ligue o PIN.',
        en: 'Unexpected link, prize or money request: call the person before clicking. If it was cloned, tell them to re-activate WhatsApp and turn on the PIN.',
      },
      minutes: 2,
    },
    done: { pt: 'Reconhece conta clonada', en: 'Spots a cloned account' },
  },
];

export const TOTAL_QUESTIONS = QUESTIONS.length;

export function categoryName(lang: Lang, c: Category): string {
  const names: Record<Category, L> = {
    accounts: { pt: 'Contas', en: 'Accounts' },
    devices: { pt: 'Aparelhos', en: 'Devices' },
    scams: { pt: 'Golpes', en: 'Scams' },
  };
  return names[c][lang];
}
