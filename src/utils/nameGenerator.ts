/**
 * Character Name Generator
 * Generates random character names from various categories
 */

// First names (common and diverse)
const FIRST_NAMES = [
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

// Last names (common surnames)
const LAST_NAMES = [
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

/**
 * Generate a random character name
 * @param options - Options for name generation
 * @returns Generated character name
 */
export const generateCharacterName = (options?: {
  firstNameOnly?: boolean;
  lastNameOnly?: boolean;
  style?: 'common' | 'fantasy' | 'modern' | 'random';
}): string => {
  const {
    firstNameOnly = false,
    lastNameOnly = false,
    style = 'random',
  } = options || {};

  if (firstNameOnly) {
    return FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  }

  if (lastNameOnly) {
    return LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  }

  // Generate first name
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  
  // Generate last name
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];

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
