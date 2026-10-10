// ---------------------------------------------------------------------------
// Every word in the game lives in this file.
//
// The story is written in first person as a draft. The places are real, but
// the memories are PLACEHOLDERS: rewrite each line in your own voice with the
// things that actually happened. Keep lines short; they show as subtitles.
// ---------------------------------------------------------------------------

export const UI = {
  title: 'Twenty Years in the Windy City',
  titleZh: '風城二十年',
  subtitle: 'A walk through the places I grew up in Hsinchu, Taiwan.',
  start: 'Start',
  resume: 'Resume',
  restart: 'Restart chapter',
  settings: 'Settings',
  controls: 'WASD move · Mouse look · E interact · Shift run · Esc pause',
  objective: 'Now',
  go: 'Board',
  continue: 'Continue',
  replay: 'Walk it again',
  keepsake: 'Keepsake',
  chooseChapter: 'Chapters you have reached can be replayed from the line map.',
  notice: {
    title: 'Best on a computer',
    body: 'This is a 3D walk made for keyboard and mouse. Open this link on a laptop or desktop.',
    anyway: 'Try anyway',
  },
  settingsPanel: {
    sensitivity: 'Mouse sensitivity',
    quality: 'Graphics',
    high: 'High',
    low: 'Low (older laptops)',
    volume: 'Sound volume',
    music: 'Music volume',
    close: 'Done',
  },
};

// Stops on the line map. Order = chapter order.
export const LINE = [
  { id: 'qianjia', name: 'Qianjia', zh: '千甲', years: 'Childhood' },
  { id: 'girlshigh', name: 'Girls’ High', zh: '新竹女中', years: 'High school' },
  { id: 'nycu', name: 'NYCU', zh: '陽明交大', years: 'University' },
  { id: 'bigcity', name: 'Big City', zh: '巨城', years: 'Now' },
];

// Keepsakes: one per chapter, gathered on the shelf at the very end.
export const KEEPSAKES = {
  photo: { name: 'An old photo', line: 'Me at Qianjia, squinting into the wind. Someone always said I should smile.' },
  nametag: { name: 'A name tag', line: 'My embroidered school name tag. I wore it every day for three years.' },
  strip: { name: 'A photo strip', line: 'Four frames from a booth near campus. We could not stop laughing in any of them.' },
  ticket: { name: 'A train ticket', line: 'Hsinchu to Qianjia. Tomorrow I will ride the line again, just to see the fields.' },
};

// ---------------------------------------------------------------------------
// Chapter 1 · Childhood · Qianjia (千甲) · dusk
// ---------------------------------------------------------------------------
export const CH1 = {
  board: { name: 'Qianjia', zh: '千甲', prev: 'North Hsinchu', next: 'Xinzhuang', caption: 'Chapter 1 · Childhood', line: 'NEIWAN LINE' },
  objectives: {
    start: 'Walk to Qianjia Station to see the train',
    store: 'Optional: stop at the corner store',
    board: 'Go to the station entrance',
  },
  intro: [
    'The evening wind is back. Grandma says Hsinchu wind can lift a small kid off the ground.',
    'They built a station in the middle of the rice fields. I want to see the train.',
  ],
  things: {
    home: ['Home. Dad’s scooter is parked crooked again.'],
    laundry: ['Mom hung the laundry out this morning. In this wind it dries in an hour.'],
    store: ['A tea egg, ten dollars. The pot has been simmering since before I was born.'],
    fridge: ['The fridge wall goes all the way to the ceiling. I always pick the chocolate milk on the bottom shelf.'],
    oden: ['Oden in the steel tray. Fish balls, radish, tofu. Grandma lets me pick two.'],
    buns: ['Steamed buns behind the foggy glass. Pork for Dad, red bean for me.'],
    potato: ['Roasted sweet potatoes on hot stones. In winter the whole store smells like them.'],
    coffee: ['Mom gets her latte here every morning. The grinder is loud enough to make me jump.'],
    kiosk: ['The kiosk prints photos, pays bills, even sells concert tickets. Dad bought our train tickets here once.'],
    seat: ['The window seats. High schoolers sit here doing homework until late.'],
    shrine: ['The little Earth God shrine. Grandma bows every time we pass, so I do too.'],
    paddy: ['The wind pushes the rice into waves. If you squint, it looks like the sea.'],
    viaduct: ['The tracks run high above the fields, like a road in the sky.'],
    photo: ['A photo of me, right here. It must have blown out of someone’s pocket.'],
    farmhouse: ['The old courtyard house. Every autumn they spread rice across the yard to dry.'],
    pavilion: ['They moved this glass lantern here from a world expo. At night it glowed like a giant sky lantern.'],
  },
  photoHint: ['(Something white is fluttering near the shrine.)'],
  trainArrives: ['The train! It is coming!'],
  // the ending, first person on the platform
  cutscene: [
    'Platform 1. My very first ticket, all my own.',
    'The board says the train to Neiwan comes at 18:42. Grandma says it is always a little late.',
  ],
  end: ['The doors open, and the wind follows me inside.'],
  keepsake: 'photo',
};

// ---------------------------------------------------------------------------
// Chapter 2 · High school · Hsinchu Girls' Senior High (新竹女中) · morning
// ---------------------------------------------------------------------------
export const CH2 = {
  board: { name: 'Girls’ High', zh: '新竹女中', prev: 'Qianjia', next: 'NYCU', caption: 'Chapter 2 · High school', line: 'EAST DISTRICT' },
  objectives: {
    breakfast: 'Grab breakfast before school',
    gate: 'Get through the school gate before 7:30',
    tag: 'Optional: find your name tag. You dropped it near the East Gate.',
    classroom: 'Get to your classroom and sit down',
  },
  intro: [
    'Seven fifteen. The East Gate roundabout is already full of scooters.',
    'Breakfast first. Always breakfast first.',
  ],
  things: {
    breakfast: ['Egg crepe and a large milk tea. The auntie knows my order before I say it.'],
    eastgate: ['Yingxi Gate. Two hundred years old, and still in the middle of the traffic.'],
    plaza: ['Everyone sits on these steps after school. Bubble tea, homework, and the gate lit up above us.'],
    gate: ['The guard nods. The teacher on duty checks every uniform, every morning.'],
    hall: ['The old lecture hall. It was here before any of us, back when this school had another name.'],
    noticeboard: ['Mock exam rankings. I look for my name, then pretend I did not.'],
    tag: ['My name tag. It came off when I stopped to tie my shoe by the gate.'],
    teacher: ['“No name tag again? Go on in, but find it before the uniform check.”', '(It must have fallen off near the East Gate.)'],
    door: ['Third floor. Up the stairs two at a time.'],
    blackboard: ['The countdown on the board. Every morning someone erases one more day.'],
    window: ['From the window you can see the hills. In autumn the wind here never stops.'],
    seat: ['I sit down just as the bell rings. My desk is full of notes from my friends.'],
  },
  lateHint: ['(Better hurry. The gate closes at seven thirty.)'],
  cutscene: [
    'The bell. Another school day begins.',
    'After a while, the days start to blur together.',
    'Mock exams. Typhoon days. Lunch on the rooftop with the windows open.',
  ],
  end: ['Three years in that seat. I did not know how fast it would go.'],
  keepsake: 'nametag',
};

// ---------------------------------------------------------------------------
// Chapter 3 · University · NYCU Guangfu campus (陽明交大) · night
// ---------------------------------------------------------------------------
export const CH3 = {
  board: { name: 'NYCU', zh: '陽明交大', prev: 'Girls’ High', next: 'Big City', caption: 'Chapter 3 · University', line: 'GUANGFU CAMPUS' },
  objectives: {
    lab: 'Leave the lab. It is almost midnight.',
    lake: 'Meet your friends by the lake',
    snacks: 'Go out the gate for late-night food',
    back: 'Bring the food back to the lake',
  },
  intro: [
    'Eleven forty at night. The build finally passed.',
    'My friends texted: lake, now, bring nothing, we will get food.',
  ],
  things: {
    lab: ['The lab never really sleeps. Someone is always running one more experiment.'],
    library: ['The library lights stay on late during finals. Half of us lived in there.'],
    scooters: ['A thousand scooters, and somehow everyone finds their own.'],
    lake: ['The lake at night. This is where we talked about everything we were going to do.'],
    friends: ['“Finally! We are starving. You are buying.”'],
    stall: ['Fried chicken, scallion pancake, and five cups of bubble tea. Dinner number two.'],
    booth: ['A photo booth by the stall. We squeeze in, all of us, and make terrible faces.'],
    gate: ['The campus gate. The science park glows just past it, where everyone thought we would end up.'],
    sculpture: ['Steel sculptures in front of the library. Nobody agreed on what they were meant to be.'],
    lotus: ['The little lotus pond under the EECS building. The moon sits in it like it belongs there.'],
  },
  cutscene: [
    '“Food! You are the best.”',
    'We lay back on the grass and watched the planes blink over the science park.',
    'We talked about everything we were going to do. Most of it, we never did. Some of it, we did.',
  ],
  end: ['We stayed by the lake until the sky turned grey. Nobody wanted to be the first to leave.'],
  keepsake: 'strip',
};

// ---------------------------------------------------------------------------
// Chapter 4 · Now · Big City (巨城) · sunset → night
// ---------------------------------------------------------------------------
export const CH4 = {
  board: { name: 'Big City', zh: '巨城', prev: 'NYCU', next: '—', caption: 'Chapter 4 · Now', line: 'ZHONGYANG ROAD' },
  objectives: {
    cross: 'Cross Zhongyang Road at the light',
    meet: 'Meet your family at the Big City plaza',
    home: 'Head home. Cross back at the light.',
    shelf: 'Look at what you kept',
    wind: 'Open the window',
  },
  intro: [
    'Saturday evening. The whole city comes to Big City on Saturday.',
    'Mom and Dad are waiting at the plaza. Same as every week.',
  ],
  things: {
    crossing: ['Scooters line up in the waiting box, engines humming. Green light. Go.'],
    family: ['“You look tired. Are you eating? We already ordered for you.”', 'Dad hands me a train ticket I left in his car. Hsinchu to Qianjia.'],
    screen: ['The big screen shows the same ad all week. I know it by heart now.'],
    street: ['This used to be fields. Now it is towers, and the lights never go off.'],
    door: ['Home. Up on the twenty-second floor, the wind sounds different.'],
  },
  shelfIntro: ['Everything I kept is on this shelf.'],
  windowLine: [
    'From up here you can see the whole city. The station, the school, the campus.',
    'Twenty years. The wind is the one thing that never changed.',
  ],
  credits: [
    'Twenty Years in the Windy City',
    'Thank you for walking with me.',
  ],
  keepsake: 'ticket',
};
