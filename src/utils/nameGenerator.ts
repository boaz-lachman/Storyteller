/**
 * Character Name Generator
 * Generates random character names from various categories
 * Supports both English and Hebrew names
 */

// English first names (common and diverse)
const ENGLISH_FIRST_NAMES = [
  // Classic/Common
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Christopher', 'Karen', 'Charles', 'Nancy', 'Daniel', 'Lisa',
  'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
  'Steven', 'Kimberly', 'Andrew', 'Emily', 'Paul', 'Donna', 'Joshua', 'Michelle',
  'Kenneth', 'Carol', 'Kevin', 'Amanda', 'Brian', 'Dorothy', 'George', 'Melissa',
  'Edward', 'Deborah', 'Ronald', 'Stephanie', 'Timothy', 'Rebecca', 'Jason', 'Sharon',
  'Jeffrey', 'Laura', 'Ryan', 'Cynthia', 'Jacob', 'Kathleen', 'Gary', 'Amy',
  'Nicholas', 'Angela', 'Eric', 'Shirley', 'Jonathan', 'Anna', 'Stephen', 'Brenda',
  'Larry', 'Pamela', 'Justin', 'Emma', 'Scott', 'Nicole', 'Brandon', 'Helen',
  'Benjamin', 'Samantha', 'Samuel', 'Katherine', 'Gregory', 'Christine', 'Alexander', 'Debra',
  'Patrick', 'Rachel', 'Frank', 'Carolyn', 'Raymond', 'Janet', 'Jack', 'Virginia',
  'Dennis', 'Maria', 'Jerry', 'Heather', 'Tyler', 'Diane', 'Aaron', 'Julie',
  'Jose', 'Joyce', 'Adam', 'Victoria', 'Nathan', 'Kelly', 'Henry', 'Christina',
  'Douglas', 'Joan', 'Zachary', 'Evelyn', 'Kyle', 'Judith', 'Noah', 'Megan',
  'Ethan', 'Cheryl', 'Jeremy', 'Andrea', 'Walter', 'Hannah', 'Christian', 'Jacqueline',
  'Keith', 'Martha', 'Roger', 'Gloria', 'Terry', 'Teresa', 'Gerald', 'Sara',
  'Harold', 'Janice', 'Sean', 'Marie', 'Austin', 'Julia', 'Carl', 'Grace',
  'Arthur', 'Judy', 'Lawrence', 'Theresa', 'Dylan', 'Madison', 'Jesse', 'Beverly',
  'Jordan', 'Denise', 'Bryan', 'Marilyn', 'Billy', 'Amber', 'Joe', 'Danielle',
  'Bruce', 'Rose', 'Gabriel', 'Brittany', 'Logan', 'Diana', 'Albert', 'Abigail',
  'Willie', 'Jane', 'Alan', 'Lori', 'Juan', 'Mildred', 'Wayne', 'Olivia',
  'Roy', 'Robin', 'Ralph', 'Andrea', 'Randy', 'Sophia', 'Eugene', 'Frances',
  'Vincent', 'Jean', 'Russell', 'Catherine', 'Elijah', 'Ann', 'Louis', 'Kathryn',
  'Bobby', 'Janet', 'Philip', 'Rachel', 'Johnny', 'Alexis', 'Evan', 'Marie',
  
  // Fantasy/Medieval
  'Ariana', 'Cedric', 'Elara', 'Gareth', 'Isolde', 'Lysander', 'Morgana', 'Thorne',
  'Rowan', 'Sage', 'Aurelia', 'Cassian', 'Darian', 'Freyja', 'Kieran', 'Luna',
  'Orion', 'Phoebe', 'Raven', 'Silas', 'Thea', 'Vesper', 'Zara', 'Aldric',
  'Briar', 'Corinne', 'Dorian', 'Elowen', 'Finnian', 'Genevieve', 'Hawthorne', 'Iris',
  'Jasper', 'Katriel', 'Lucien', 'Maeve', 'Nora', 'Oberon', 'Persephone', 'Quinn',
  'Rhiannon', 'Seraphina', 'Tristan', 'Ursa', 'Valen', 'Willa', 'Xara', 'Yves',
  'Zephyr', 'Amara', 'Bastian', 'Calla', 'Dante', 'Eira', 'Faelan', 'Gwendolyn',
  'Helios', 'Ivy', 'Jorah', 'Kaida', 'Lyra', 'Magnus', 'Niamh', 'Ophelia',
  
  // Modern/Creative
  'Alex', 'Riley', 'Casey', 'Jordan', 'Morgan', 'Avery', 'Quinn', 'Skyler',
  'Parker', 'Cameron', 'Taylor', 'Dakota', 'Logan', 'Blake', 'Sage', 'River',
  'Phoenix', 'Rowan', 'Skye', 'Indigo', 'Jade', 'Asher', 'Aurora', 'Nova',
  'Luna', 'Zoe', 'Maya', 'Ivy', 'Ruby', 'Piper', 'Willow', 'Hazel',
  'Grace', 'Charlotte', 'Emma', 'Olivia', 'Sophia', 'Amelia', 'Isabella', 'Mia',
  'Evelyn', 'Harper', 'Camila', 'Gianna', 'Abigail', 'Luna', 'Ella', 'Elizabeth',
  'Sofia', 'Emily', 'Avery', 'Mila', 'Scarlett', 'Eleanor', 'Madison', 'Layla',
  'Penelope', 'Aria', 'Chloe', 'Grace', 'Ellie', 'Nora', 'Hannah', 'Victoria',
];

// Hebrew first names
const HEBREW_FIRST_NAMES = [
  // Common Hebrew names
  'אבי', 'אברהם', 'אדיר', 'אהוד', 'אור', 'אורי', 'אוריאל', 'אלון', 'אליעזר', 'אליהו',
  'אמיר', 'אסף', 'אשר', 'בן', 'בנימין', 'גד', 'גדעון', 'גיל', 'דן', 'דוד',
  'דור', 'דורון', 'דני', 'הדר', 'זאב', 'חיים', 'חנן', 'טל', 'יאיר', 'יואב',
  'יובל', 'יוגב', 'יונתן', 'יוסי', 'יוסף', 'יעקב', 'יצחק', 'ירון', 'ישי', 'ישראל',
  'כרמל', 'ליאור', 'ליעד', 'מאיר', 'מיכאל', 'מתן', 'נדב', 'נועם', 'נח', 'נתן',
  'עומר', 'עידו', 'עמית', 'עמיר', 'ערן', 'פלג', 'ציון', 'קובי', 'רועי', 'רן',
  'רפאל', 'שאול', 'שי', 'שלום', 'שלמה', 'שמואל', 'תום', 'תומר',
  
  // Female Hebrew names
  'אביגיל', 'אביה', 'אביטל', 'אבישג', 'אדווה', 'אדל', 'אדר', 'אהובה', 'אור', 'אורה',
  'אורית', 'אורלי', 'אושרי', 'איה', 'אילנה', 'איריס', 'אלונה', 'אליה', 'אלין', 'אלינור',
  'אליס', 'אמילי', 'אן', 'אנא', 'אנה', 'אסנת', 'אסתר', 'אריאל', 'אריאלה', 'בת',
  'בת-אל', 'בת-שבע', 'גאיה', 'גבריאל', 'גילי', 'גל', 'גלי', 'גפן', 'דבורה', 'דגנית',
  'דור', 'דורית', 'דנה', 'דניאל', 'דניאלה', 'הדס', 'הדסה', 'הילה', 'הלל', 'הראל',
  'זהבה', 'זיו', 'חוה', 'חגית', 'חנה', 'טל', 'טליה', 'יאירה', 'יהל', 'יהלי',
  'יהלום', 'יובל', 'יונה', 'יונית', 'יעל', 'יעלה', 'יפית', 'יסמין', 'כרמל', 'כרמלה',
  'ליאור', 'ליאורה', 'ליאן', 'ליאת', 'ליבי', 'ליה', 'ליזה', 'לימור', 'לירון', 'מאיה',
  'מיכל', 'מיקה', 'מירב', 'מירי', 'מישאל', 'מעיין', 'מרגלית', 'נגה', 'נועה', 'נועם',
  'נורית', 'נטע', 'נטעלי', 'נילי', 'נינה', 'ניצן', 'נעמה', 'נתלי', 'סיגל', 'סיון',
  'עדי', 'עדן', 'עדנה', 'עדי', 'עידית', 'עינב', 'עלמה', 'עמית', 'ענת', 'עפרה',
  'פז', 'פלג', 'צביה', 'ציון', 'ציפי', 'קרן', 'רונה', 'רות', 'רותם', 'רז',
  'רזיאל', 'רינת', 'רנה', 'שגית', 'שולמית', 'שושנה', 'שירה', 'שיראל', 'שלי', 'שרית',
  'תאיר', 'תהל', 'תמר', 'תמרה',
];

// English last names (common surnames)
const ENGLISH_LAST_NAMES = [
  // Common surnames
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor',
  'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris', 'Sanchez',
  'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King',
  'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams',
  'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts',
  'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz', 'Edwards',
  'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy', 'Cook', 'Rogers',
  'Gutierrez', 'Ortiz', 'Morgan', 'Cooper', 'Peterson', 'Bailey', 'Reed', 'Kelly',
  'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson', 'Watson', 'Brooks',
  'Chavez', 'Wood', 'James', 'Bennett', 'Gray', 'Mendoza', 'Ruiz', 'Hughes',
  'Price', 'Alvarez', 'Castillo', 'Sanders', 'Patel', 'Myers', 'Long', 'Ross',
  'Foster', 'Jimenez', 'Powell', 'Jenkins', 'Perry', 'Russell', 'Sullivan', 'Bell',
  'Coleman', 'Butler', 'Henderson', 'Barnes', 'Gonzales', 'Fisher', 'Vasquez', 'Simmons',
  'Romero', 'Jordan', 'Patterson', 'Alexander', 'Hamilton', 'Graham', 'Reynolds', 'Griffin',
  'Wallace', 'Moreno', 'West', 'Cole', 'Hayes', 'Bryant', 'Herrera', 'Gibson',
  'Ellis', 'Tran', 'Medina', 'Aguilar', 'Stevens', 'Murray', 'Ford', 'Castro',
  'Marshall', 'Owens', 'Harrison', 'Fernandez', 'Mcdonald', 'Woods', 'Washington', 'Kennedy',
  'Wells', 'Vargas', 'Henry', 'Chen', 'Freeman', 'Webb', 'Tucker', 'Guzman',
  'Burns', 'Crawford', 'Olson', 'Simpson', 'Porter', 'Hunter', 'Gordon', 'Mendez',
  
  // Fantasy/Medieval
  'Blackwood', 'Brightblade', 'Darkwater', 'Fireheart', 'Goldleaf', 'Ironforge', 'Moonwhisper', 'Shadowbane',
  'Stormwind', 'Thornfield', 'Whitethorn', 'Ashwood', 'Briarwood', 'Cinderfall', 'Dragonheart', 'Evergreen',
  'Frostblade', 'Grimstone', 'Holloway', 'Ironwood', 'Jadevale', 'Kingsley', 'Lighthaven', 'Mistborn',
  'Nightshade', 'Oakshield', 'Pinecrest', 'Quicksilver', 'Ravencrest', 'Silverlake', 'Thornhart', 'Underwood',
  'Valefield', 'Winterfell', 'Wildwood', 'Ashford', 'Beacon', 'Crestfall', 'Dawnwood', 'Elderwood',
  'Falconer', 'Greymoor', 'Halloway', 'Ivory', 'Jasper', 'Kestrel', 'Larkspur', 'Meadowbrook',
  'Northwood', 'Oakwood', 'Pembroke', 'Quill', 'Redwood', 'Starling', 'Trueheart', 'Vale',
  'Westerly', 'Woodward', 'Alderman', 'Bainbridge', 'Chesterton', 'Derwent', 'Eastman', 'Farrington',
];

// Hebrew last names (common Israeli surnames)
const HEBREW_LAST_NAMES = [
  'כהן', 'לוי', 'מזרחי', 'ביטון', 'דהן', 'אברהם', 'פרידמן', 'אזולאי', 'דוד', 'חדד',
  'עמר', 'יוסף', 'אדרי', 'סבג', 'בן-דוד', 'שלום', 'אוחנה', 'משה', 'סויסה', 'אלון',
  'כץ', 'דיין', 'רוזן', 'גולן', 'בר', 'שפירו', 'גרין', 'כהן-סגל', 'שטרן', 'וייס',
  'ברגר', 'גולדברג', 'כץ', 'לוי', 'מור', 'נחום', 'עוז', 'פישר', 'קליין', 'רובין',
  'שרון', 'תמיר', 'אברמוביץ', 'ברק', 'גלעד', 'דורון', 'הראל', 'יזרעאלי', 'כהן-תמיר', 'ליפשיץ',
  'מאיר', 'נבון', 'סלע', 'עמית', 'פלד', 'צור', 'קרן', 'רוזן-צבי', 'שדה', 'תמיר',
  'אביב', 'ברקת', 'גבע', 'דביר', 'הדר', 'יזרעאל', 'כהן-שלום', 'לוי-אברהם', 'מאירי', 'נחום-לוי',
  'סלע-כהן', 'עמית-דוד', 'פלד-יוסף', 'צור-משה', 'קרן-אברהם', 'רוזן-דוד', 'שדה-יוסף', 'תמיר-כהן',
];

/**
 * Generate a random character name
 * @param options - Options for name generation
 * @returns Generated character name
 */
export const generateCharacterName = (options?: {
  firstNameOnly?: boolean;
  lastNameOnly?: boolean;
  style?: 'common' | 'fantasy' | 'modern' | 'random';
  language?: 'en' | 'he';
}): string => {
  const {
    firstNameOnly = false,
    lastNameOnly = false,
    style = 'random',
    language = 'en',
  } = options || {};

  // Select name arrays based on language
  const firstNames = language === 'he' ? HEBREW_FIRST_NAMES : ENGLISH_FIRST_NAMES;
  const lastNames = language === 'he' ? HEBREW_LAST_NAMES : ENGLISH_LAST_NAMES;

  if (firstNameOnly) {
    return firstNames[Math.floor(Math.random() * firstNames.length)];
  }

  if (lastNameOnly) {
    return lastNames[Math.floor(Math.random() * lastNames.length)];
  }

  // Generate first name
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  
  // Generate last name
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

  return `${firstName} ${lastName}`;
};

/**
 * Generate multiple character names
 * @param count - Number of names to generate
 * @param options - Options for name generation
 * @returns Array of generated character names
 */
export const generateCharacterNames = (
  count: number,
  options?: Parameters<typeof generateCharacterName>[0]
): string[] => {
  const names: string[] = [];
  for (let i = 0; i < count; i++) {
    names.push(generateCharacterName(options));
  }
  return names;
};
