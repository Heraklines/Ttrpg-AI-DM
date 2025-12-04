/**
 * Soul Mirror Quiz - Question Pool
 * 
 * 50+ personality questions organized by category:
 * - Fantasy scenarios (~25): Immersive D&D situations
 * - Real-life reflections (~15): Direct Big Five measurement  
 * - D&D hypotheticals (~10): Party dynamics and moral dilemmas
 * 
 * Each answer maps to Big Five scores (-10 to +10 per dimension).
 */

import { QuizQuestion, QuizAnswer, BigFiveDimension } from './types';

// Helper to create questions more concisely
function q(
    id: string,
    text: string,
    category: 'fantasy_scenario' | 'real_life' | 'dnd_hypothetical',
    dimension: BigFiveDimension,
    answers: QuizAnswer[]
): QuizQuestion {
    return { id, text, category, dimension, answers };
}

// ==========================================
// FANTASY SCENARIO QUESTIONS (~25)
// Immersive D&D situations testing personality indirectly
// ==========================================

const FANTASY_QUESTIONS: QuizQuestion[] = [
    q('fs1',
        'You discover a hidden door in the dungeon. Beyond it, you hear strange whispers in an unknown language. What do you do?',
        'fantasy_scenario', 'O',
        [
            { text: 'Burst through immediately—adventure awaits!', scores: { O: 8, E: 5, N: -3 }, classHints: ['Barbarian', 'Fighter'] },
            { text: 'Listen carefully and try to decipher the language first.', scores: { O: 6, C: 4, E: -2 }, classHints: ['Wizard', 'Bard'] },
            { text: 'Mark it on my map and return when I\'m better prepared.', scores: { C: 8, O: -2, N: 3 }, classHints: ['Ranger', 'Rogue'] },
            { text: 'Seal the door and report it to the nearest authority.', scores: { C: 6, A: 4, O: -5 }, classHints: ['Paladin', 'Cleric'] },
        ]
    ),

    q('fs2',
        'A merchant offers you a mysterious potion. He claims it grants great power, but refuses to explain the side effects.',
        'fantasy_scenario', 'O',
        [
            { text: 'Drink it immediately—fortune favors the bold!', scores: { O: 10, N: -5, C: -4 }, classHints: ['Sorcerer', 'Barbarian'] },
            { text: 'Buy it but analyze it thoroughly before drinking.', scores: { O: 4, C: 6, E: -2 }, classHints: ['Wizard', 'Artificer'] },
            { text: 'Haggle for information before deciding.', scores: { E: 5, C: 3, A: -2 }, classHints: ['Bard', 'Rogue'] },
            { text: 'Decline—unknown magic is too dangerous.', scores: { C: 6, N: 4, O: -6 }, classHints: ['Monk', 'Paladin'] },
        ]
    ),

    q('fs3',
        'Your party must cross a treacherous bridge. You could go first, last, or suggest an alternative route.',
        'fantasy_scenario', 'E',
        [
            { text: 'I\'ll go first—someone needs to lead.', scores: { E: 8, A: 4, N: -5 }, classHints: ['Paladin', 'Fighter'] },
            { text: 'Let me check for a safer route around.', scores: { C: 6, O: 3, E: -3 }, classHints: ['Ranger', 'Druid'] },
            { text: 'I\'ll take the middle—safety in numbers.', scores: { A: 5, C: 3, E: -2 }, classHints: ['Cleric', 'Bard'] },
            { text: 'I\'ll go last to help anyone who falls.', scores: { A: 7, E: -4, C: 4 }, classHints: ['Cleric', 'Monk'] },
        ]
    ),

    q('fs4',
        'You\'ve found a powerful artifact, but it clearly belonged to someone else. The original owner is nowhere to be seen.',
        'fantasy_scenario', 'A',
        [
            { text: 'It\'s mine now—finders keepers.', scores: { A: -8, E: 4, C: -3 }, classHints: ['Rogue', 'Warlock'] },
            { text: 'I\'ll keep it safe until I can find the owner.', scores: { A: 8, C: 5, E: -2 }, classHints: ['Paladin', 'Cleric'] },
            { text: 'Study it first, then decide what to do.', scores: { O: 6, C: 4, A: 0 }, classHints: ['Wizard', 'Bard'] },
            { text: 'Leave it—it probably has a curse.', scores: { N: 6, C: 4, O: -4 }, classHints: ['Monk', 'Druid'] },
        ]
    ),

    q('fs5',
        'A rival adventurer challenges you to a duel over a petty insult.',
        'fantasy_scenario', 'A',
        [
            { text: 'Accept immediately—my honor demands it!', scores: { E: 8, A: -6, N: 3 }, classHints: ['Barbarian', 'Fighter'] },
            { text: 'Decline and walk away. I have better things to do.', scores: { C: 5, A: 4, E: -5 }, classHints: ['Monk', 'Wizard'] },
            { text: 'Suggest we settle this with a friendly competition instead.', scores: { A: 6, E: 4, C: 2 }, classHints: ['Bard', 'Paladin'] },
            { text: 'Accept, but only if I can choose the terms.', scores: { C: 6, E: 3, A: -2 }, classHints: ['Rogue', 'Ranger'] },
        ]
    ),

    q('fs6',
        'The village elder begs you to slay a dragon threatening the town. The reward is meager.',
        'fantasy_scenario', 'A',
        [
            { text: 'I\'ll do it for free—these people need help.', scores: { A: 10, C: -3, E: 4 }, classHints: ['Paladin', 'Cleric'] },
            { text: 'I\'ll help, but I need better payment to risk my life.', scores: { C: 6, A: -2, E: 3 }, classHints: ['Fighter', 'Ranger'] },
            { text: 'Let me assess the threat first—maybe there\'s a peaceful solution.', scores: { O: 6, A: 4, C: 3 }, classHints: ['Druid', 'Bard'] },
            { text: 'That sounds like someone else\'s problem.', scores: { A: -8, E: -3, C: 4 }, classHints: ['Rogue', 'Warlock'] },
        ]
    ),

    q('fs7',
        'You\'re offered the chance to join a secret society with unknown goals but great power.',
        'fantasy_scenario', 'C',
        [
            { text: 'Absolutely! Power and mystery—sign me up!', scores: { O: 8, C: -5, N: 3 }, classHints: ['Warlock', 'Sorcerer'] },
            { text: 'I need to know more about their goals first.', scores: { C: 7, O: 3, A: 2 }, classHints: ['Wizard', 'Paladin'] },
            { text: 'Pretend to join to gather intelligence.', scores: { C: 4, E: 5, A: -4 }, classHints: ['Rogue', 'Bard'] },
            { text: 'Decline—I prefer to walk my own path.', scores: { E: -5, C: 4, O: 2 }, classHints: ['Monk', 'Ranger'] },
        ]
    ),

    q('fs8',
        'Your spell accidentally sets fire to an ally\'s equipment during combat.',
        'fantasy_scenario', 'N',
        [
            { text: 'Keep fighting—we\'ll sort it out after the battle!', scores: { E: 6, N: -7, C: 3 }, classHints: ['Fighter', 'Barbarian'] },
            { text: 'Apologize profusely while trying to fix it immediately.', scores: { A: 6, N: 6, C: 2 }, classHints: ['Cleric', 'Bard'] },
            { text: 'Feel terrible, but stay focused on winning first.', scores: { C: 5, N: 4, A: 3 }, classHints: ['Wizard', 'Paladin'] },
            { text: 'Blame the chaos of battle—stuff happens.', scores: { N: -6, A: -4, E: 5 }, classHints: ['Sorcerer', 'Rogue'] },
        ]
    ),

    q('fs9',
        'A dying enemy asks you to deliver a message to their family.',
        'fantasy_scenario', 'A',
        [
            { text: 'Of course. Every soul deserves final peace.', scores: { A: 10, C: 4, E: -2 }, classHints: ['Cleric', 'Paladin'] },
            { text: 'I\'ll consider it—depends on what they did.', scores: { C: 5, A: 2, E: 2 }, classHints: ['Fighter', 'Ranger'] },
            { text: 'Extract information first, then maybe.', scores: { C: 4, A: -4, E: 3 }, classHints: ['Rogue', 'Bard'] },
            { text: 'They made their choice. I have my own concerns.', scores: { A: -7, C: 3, N: -3 }, classHints: ['Warlock', 'Barbarian'] },
        ]
    ),

    q('fs10',
        'You wake up in a strange place with no memory of the last week.',
        'fantasy_scenario', 'N',
        [
            { text: 'Stay calm and methodically retrace my steps.', scores: { C: 8, N: -6, E: -2 }, classHints: ['Wizard', 'Monk'] },
            { text: 'Panic! This is terrifying!', scores: { N: 10, C: -5, E: 4 }, classHints: ['Sorcerer'] },
            { text: 'Excitedly investigate—this is an adventure!', scores: { O: 8, N: -5, E: 6 }, classHints: ['Bard', 'Rogue'] },
            { text: 'Find the nearest person and demand answers.', scores: { E: 7, A: -3, N: 3 }, classHints: ['Barbarian', 'Fighter'] },
        ]
    ),

    q('fs11',
        'A cursed book offers great knowledge but drains your vitality each time you read it.',
        'fantasy_scenario', 'O',
        [
            { text: 'Knowledge is worth any price. I\'ll read it carefully.', scores: { O: 10, C: 4, N: -4 }, classHints: ['Wizard', 'Warlock'] },
            { text: 'Find a way to break the curse first.', scores: { C: 7, O: 3, A: 2 }, classHints: ['Cleric', 'Paladin'] },
            { text: 'Read just a little—I can handle some risk.', scores: { O: 5, N: 2, C: -2 }, classHints: ['Bard', 'Sorcerer'] },
            { text: 'Destroy it before it harms anyone.', scores: { A: 6, C: 5, O: -6 }, classHints: ['Paladin', 'Monk'] },
        ]
    ),

    q('fs12',
        'Your party needs to infiltrate a noble\'s ball. How do you contribute?',
        'fantasy_scenario', 'E',
        [
            { text: 'I\'ll charm the guests and gather information.', scores: { E: 10, A: 3, C: -2 }, classHints: ['Bard', 'Rogue'] },
            { text: 'I\'ll stay in the shadows and observe.', scores: { E: -7, C: 5, O: 3 }, classHints: ['Rogue', 'Ranger'] },
            { text: 'I\'ll pose as a servant and listen to conversations.', scores: { C: 6, E: 2, A: 3 }, classHints: ['Monk', 'Rogue'] },
            { text: 'I\'ll guard the exits in case things go wrong.', scores: { C: 5, A: 4, E: -3 }, classHints: ['Fighter', 'Paladin'] },
        ]
    ),

    q('fs13',
        'You find a town where everyone is suspiciously happy and welcoming.',
        'fantasy_scenario', 'C',
        [
            { text: 'Enjoy the hospitality! Maybe life is good here.', scores: { A: 5, O: 3, C: -5 }, classHints: ['Bard'] },
            { text: 'Something\'s wrong. Investigate immediately.', scores: { C: 8, N: 4, O: 3 }, classHints: ['Rogue', 'Ranger'] },
            { text: 'Stay alert but don\'t let paranoia ruin things.', scores: { C: 4, N: 2, A: 3 }, classHints: ['Fighter', 'Monk'] },
            { text: 'Leave at once. This can only end badly.', scores: { N: 7, C: 5, O: -4 }, classHints: ['Druid', 'Ranger'] },
        ]
    ),

    q('fs14',
        'A powerful being offers you a deal: great power now in exchange for a favor later.',
        'fantasy_scenario', 'C',
        [
            { text: 'Accept! I\'ll deal with consequences later.', scores: { O: 6, C: -8, N: -3 }, classHints: ['Warlock', 'Sorcerer'] },
            { text: 'Negotiate the exact terms before deciding.', scores: { C: 8, O: 3, A: -2 }, classHints: ['Wizard', 'Bard'] },
            { text: 'Decline firmly. Such deals always go sour.', scores: { C: 7, A: 4, O: -4 }, classHints: ['Paladin', 'Monk'] },
            { text: 'Pretend to accept while planning to betray them.', scores: { E: 4, A: -6, C: 3 }, classHints: ['Rogue', 'Warlock'] },
        ]
    ),

    q('fs15',
        'You\'ve been traveling alone for three days. A stranger offers to share their campfire.',
        'fantasy_scenario', 'E',
        [
            { text: 'Gladly! Company would be wonderful.', scores: { E: 8, A: 5, N: -3 }, classHints: ['Bard', 'Cleric'] },
            { text: 'Accept cautiously, keeping my weapon close.', scores: { C: 6, E: 2, N: 3 }, classHints: ['Ranger', 'Fighter'] },
            { text: 'Make my own camp nearby but chat from a distance.', scores: { E: -2, C: 5, A: 2 }, classHints: ['Druid', 'Monk'] },
            { text: 'Decline. I prefer my solitude.', scores: { E: -8, C: 4, A: -2 }, classHints: ['Ranger', 'Wizard'] },
        ]
    ),

    q('fs16',
        'During a celebration, villagers ask you to perform or entertain them.',
        'fantasy_scenario', 'E',
        [
            { text: 'I love being the center of attention! Let\'s go!', scores: { E: 10, O: 4, N: -5 }, classHints: ['Bard'] },
            { text: 'I\'ll tell stories of our adventures.', scores: { E: 5, O: 3, A: 4 }, classHints: ['Bard', 'Paladin'] },
            { text: 'I\'ll participate but prefer not to lead.', scores: { A: 5, E: -2, C: 3 }, classHints: ['Cleric', 'Monk'] },
            { text: 'Watch from the sidelines—not my thing.', scores: { E: -8, C: 4, A: 2 }, classHints: ['Wizard', 'Ranger'] },
        ]
    ),

    q('fs17',
        'A magical portal appears. Through it, you glimpse a world of wonder—or danger.',
        'fantasy_scenario', 'O',
        [
            { text: 'Jump in immediately! Adventure awaits!', scores: { O: 10, C: -6, N: -4 }, classHints: ['Sorcerer', 'Barbarian'] },
            { text: 'Study the portal carefully before deciding.', scores: { O: 4, C: 8, E: -2 }, classHints: ['Wizard'] },
            { text: 'Throw something through first to test it.', scores: { O: 5, C: 6, N: 2 }, classHints: ['Rogue', 'Ranger'] },
            { text: 'Close or destroy it—unknown portals are dangerous.', scores: { C: 6, N: 5, O: -7 }, classHints: ['Paladin', 'Monk'] },
        ]
    ),

    q('fs18',
        'You discover your trusted ally has been hiding a dark secret.',
        'fantasy_scenario', 'A',
        [
            { text: 'Confront them privately and hear them out.', scores: { A: 6, C: 5, E: 2 }, classHints: ['Cleric', 'Paladin'] },
            { text: 'Report them—secrets are dangerous.', scores: { C: 7, A: -4, E: 3 }, classHints: ['Paladin', 'Fighter'] },
            { text: 'Keep it to myself and watch them closely.', scores: { C: 5, E: -3, A: -2 }, classHints: ['Rogue', 'Ranger'] },
            { text: 'Help them hide it—we all have secrets.', scores: { A: 8, C: -4, N: 3 }, classHints: ['Bard', 'Rogue'] },
        ]
    ),

    q('fs19',
        'An ancient dragon offers to teach you its wisdom if you serve it for a year.',
        'fantasy_scenario', 'O',
        [
            { text: 'A year for a dragon\'s wisdom? Absolutely!', scores: { O: 10, C: 5, E: -3 }, classHints: ['Wizard', 'Warlock'] },
            { text: 'Negotiate for better terms first.', scores: { C: 6, E: 4, A: -2 }, classHints: ['Bard', 'Rogue'] },
            { text: 'Decline respectfully—I forge my own path.', scores: { E: -5, C: 4, O: -3 }, classHints: ['Monk', 'Paladin'] },
            { text: 'Ask if I can learn without serving.', scores: { O: 5, A: 4, C: 3 }, classHints: ['Cleric', 'Druid'] },
        ]
    ),

    q('fs20',
        'You find a wounded enemy soldier on the battlefield.',
        'fantasy_scenario', 'A',
        [
            { text: 'Heal them. All life is precious.', scores: { A: 10, C: -3, E: 2 }, classHints: ['Cleric', 'Paladin'] },
            { text: 'Question them first, then decide.', scores: { C: 6, A: -2, E: 3 }, classHints: ['Ranger', 'Fighter'] },
            { text: 'Leave them—they chose their side.', scores: { A: -5, C: 4, N: -3 }, classHints: ['Barbarian', 'Warlock'] },
            { text: 'End their suffering quickly.', scores: { A: 2, C: 5, N: 4 }, classHints: ['Fighter', 'Rogue'] },
        ]
    ),

    q('fs21',
        'A spirit offers to haunt your dreams in exchange for prophetic visions.',
        'fantasy_scenario', 'N',
        [
            { text: 'Accept—knowledge of the future is invaluable.', scores: { O: 7, N: -4, C: 3 }, classHints: ['Warlock', 'Wizard'] },
            { text: 'I can\'t risk my mental health for this.', scores: { N: 6, C: 6, O: -4 }, classHints: ['Monk', 'Cleric'] },
            { text: 'Try it for one night and see.', scores: { O: 5, C: 3, N: 2 }, classHints: ['Bard', 'Sorcerer'] },
            { text: 'Banish the spirit—nothing good comes from this.', scores: { C: 6, A: 4, O: -5 }, classHints: ['Paladin', 'Cleric'] },
        ]
    ),

    q('fs22',
        'Your team plans to attack a goblin camp. What\'s your role?',
        'fantasy_scenario', 'E',
        [
            { text: 'Lead the charge and inspire the others!', scores: { E: 9, A: 3, N: -5 }, classHints: ['Paladin', 'Fighter'] },
            { text: 'Scout ahead and report enemy positions.', scores: { C: 6, E: -3, O: 3 }, classHints: ['Rogue', 'Ranger'] },
            { text: 'Stay back and provide magical support.', scores: { E: -5, C: 5, O: 4 }, classHints: ['Wizard', 'Sorcerer'] },
            { text: 'Protect the wounded and reserve strength.', scores: { A: 6, C: 4, E: -2 }, classHints: ['Cleric', 'Druid'] },
        ]
    ),

    q('fs23',
        'You discover your weapon is sentient and has its own desires.',
        'fantasy_scenario', 'O',
        [
            { text: 'Fascinating! Let\'s have a conversation.', scores: { O: 9, A: 4, C: -2 }, classHints: ['Bard', 'Warlock'] },
            { text: 'Establish clear boundaries immediately.', scores: { C: 8, A: -2, E: 2 }, classHints: ['Paladin', 'Fighter'] },
            { text: 'Get rid of it—this is too weird.', scores: { C: 4, N: 5, O: -6 }, classHints: ['Monk', 'Cleric'] },
            { text: 'Use it but don\'t trust it.', scores: { C: 5, E: 3, A: -4 }, classHints: ['Rogue', 'Ranger'] },
        ]
    ),

    q('fs24',
        'A child accidentally releases a dangerous creature. The villagers want to punish them harshly.',
        'fantasy_scenario', 'A',
        [
            { text: 'Defend the child—it was an accident!', scores: { A: 10, E: 5, C: -3 }, classHints: ['Paladin', 'Cleric'] },
            { text: 'The child must face consequences, but fair ones.', scores: { C: 7, A: 3, E: 2 }, classHints: ['Fighter', 'Monk'] },
            { text: 'Focus on catching the creature first.', scores: { C: 6, A: 2, E: 3 }, classHints: ['Ranger', 'Druid'] },
            { text: 'Stay out of it—this isn\'t my problem.', scores: { A: -6, E: -4, C: 4 }, classHints: ['Rogue', 'Warlock'] },
        ]
    ),

    q('fs25',
        'You gain the ability to read minds briefly. What do you do first?',
        'fantasy_scenario', 'C',
        [
            { text: 'Read everyone\'s minds immediately!', scores: { O: 8, C: -6, A: -4 }, classHints: ['Warlock', 'Sorcerer'] },
            { text: 'Only use it when absolutely necessary.', scores: { C: 8, A: 5, E: -2 }, classHints: ['Monk', 'Paladin'] },
            { text: 'Test it on someone I suspect is lying.', scores: { C: 5, E: 3, A: -2 }, classHints: ['Rogue', 'Ranger'] },
            { text: 'Never use it—reading minds is a violation.', scores: { A: 8, C: 6, O: -5 }, classHints: ['Cleric', 'Paladin'] },
        ]
    ),
];

// ==========================================
// REAL-LIFE REFLECTION QUESTIONS (~15)
// Direct Big Five measurement for accuracy
// ==========================================

const REALLIFE_QUESTIONS: QuizQuestion[] = [
    q('rl1',
        'When working on a group project, I prefer to...',
        'real_life', 'E',
        [
            { text: 'Take charge and delegate tasks to everyone.', scores: { E: 10, C: 4, A: -2 } },
            { text: 'Contribute ideas but let others lead.', scores: { E: 2, A: 5, C: 3 } },
            { text: 'Work on my part alone and combine it later.', scores: { E: -7, C: 6, O: 2 } },
            { text: 'Support whoever emerges as the leader.', scores: { A: 7, E: -3, C: 4 } },
        ]
    ),

    q('rl2',
        'When I have free time, I\'m most likely to...',
        'real_life', 'O',
        [
            { text: 'Try something I\'ve never done before.', scores: { O: 10, E: 4, C: -3 } },
            { text: 'Enjoy a favorite hobby or activity.', scores: { O: -3, C: 5, A: 2 } },
            { text: 'Read, learn, or explore new ideas.', scores: { O: 7, E: -4, C: 4 } },
            { text: 'Relax with friends or family.', scores: { E: 6, A: 5, O: -2 } },
        ]
    ),

    q('rl3',
        'When I make a mistake, I typically...',
        'real_life', 'N',
        [
            { text: 'Dwell on it and feel bad for a while.', scores: { N: 9, C: 3, E: -4 } },
            { text: 'Analyze what went wrong to prevent it later.', scores: { C: 8, N: 2, O: 3 } },
            { text: 'Shrug it off—everyone makes mistakes.', scores: { N: -8, E: 4, O: 2 } },
            { text: 'Apologize if needed and move on quickly.', scores: { A: 5, N: -4, C: 3 } },
        ]
    ),

    q('rl4',
        'My ideal vacation would be...',
        'real_life', 'O',
        [
            { text: 'Backpacking through unfamiliar places.', scores: { O: 10, E: 5, C: -4 } },
            { text: 'A well-planned trip to famous landmarks.', scores: { C: 7, O: 3, E: 2 } },
            { text: 'Relaxing at a resort with everything included.', scores: { O: -5, C: 4, N: -3 } },
            { text: 'Staying home—I prefer my own space.', scores: { E: -8, C: 5, O: -4 } },
        ]
    ),

    q('rl5',
        'When someone disagrees with my opinion, I...',
        'real_life', 'A',
        [
            { text: 'Defend my position firmly until they understand.', scores: { E: 6, A: -6, C: 4 } },
            { text: 'Try to find common ground and compromise.', scores: { A: 8, E: 3, C: 3 } },
            { text: 'Consider their viewpoint—maybe I\'m wrong.', scores: { O: 6, A: 5, E: -2 } },
            { text: 'Avoid the conflict and change the subject.', scores: { A: 4, N: 5, E: -5 } },
        ]
    ),

    q('rl6',
        'My workspace is usually...',
        'real_life', 'C',
        [
            { text: 'Meticulously organized with everything in place.', scores: { C: 10, O: -3, N: -2 } },
            { text: 'Organized chaos—I know where everything is.', scores: { O: 5, C: -4, E: 2 } },
            { text: 'Somewhat tidy with occasional clutter.', scores: { C: 3, O: 2, A: 2 } },
            { text: 'Clean but I don\'t stress about it.', scores: { C: 5, N: -4, A: 3 } },
        ]
    ),

    q('rl7',
        'At a party with strangers, I\'m most likely to...',
        'real_life', 'E',
        [
            { text: 'Introduce myself to everyone I can.', scores: { E: 10, A: 4, N: -5 } },
            { text: 'Find a few people to have deep conversations with.', scores: { E: 2, O: 5, A: 3 } },
            { text: 'Stay near friends and meet people through them.', scores: { E: -3, A: 5, N: 2 } },
            { text: 'Find a quiet corner and possibly leave early.', scores: { E: -9, N: 4, C: 3 } },
        ]
    ),

    q('rl8',
        'When facing a difficult decision, I...',
        'real_life', 'C',
        [
            { text: 'Create a pros/cons list and analyze carefully.', scores: { C: 9, O: 2, N: 2 } },
            { text: 'Trust my gut instinct.', scores: { O: 5, C: -5, E: 3 } },
            { text: 'Ask others for their opinions.', scores: { A: 6, E: 4, C: 2 } },
            { text: 'Put it off until I absolutely have to decide.', scores: { C: -6, N: 5, A: 2 } },
        ]
    ),

    q('rl9',
        'When I see someone being treated unfairly, I...',
        'real_life', 'A',
        [
            { text: 'Speak up immediately, even if it\'s uncomfortable.', scores: { A: 8, E: 6, C: -2 } },
            { text: 'Find a subtle way to help without confrontation.', scores: { A: 6, C: 5, E: -3 } },
            { text: 'Report it to someone in authority.', scores: { C: 6, A: 4, E: -2 } },
            { text: 'Mind my own business—it\'s not my problem.', scores: { A: -8, C: 3, E: -4 } },
        ]
    ),

    q('rl10',
        'I feel most energized when...',
        'real_life', 'E',
        [
            { text: 'Surrounded by people and activity.', scores: { E: 10, A: 4, O: 2 } },
            { text: 'Working on something I\'m passionate about.', scores: { O: 6, C: 5, E: -2 } },
            { text: 'Having meaningful one-on-one conversations.', scores: { E: 3, A: 6, O: 3 } },
            { text: 'Having quiet time to myself to recharge.', scores: { E: -10, C: 4, O: 3 } },
        ]
    ),

    q('rl11',
        'When learning something new, I prefer...',
        'real_life', 'O',
        [
            { text: 'Experimenting and figuring it out myself.', scores: { O: 8, C: -3, E: 3 } },
            { text: 'Following a structured course or tutorial.', scores: { C: 8, O: -3, E: -2 } },
            { text: 'Learning alongside others in a group.', scores: { E: 6, A: 5, O: 2 } },
            { text: 'Having someone teach me one-on-one.', scores: { E: 2, A: 4, C: 4 } },
        ]
    ),

    q('rl12',
        'When I\'m stressed, I tend to...',
        'real_life', 'N',
        [
            { text: 'Worry and have trouble sleeping.', scores: { N: 10, C: 2, E: -4 } },
            { text: 'Get irritable or snap at others.', scores: { N: 6, A: -6, E: 3 } },
            { text: 'Throw myself into work to distract myself.', scores: { C: 7, N: 4, E: -2 } },
            { text: 'Stay calm and work through it methodically.', scores: { N: -8, C: 6, O: 2 } },
        ]
    ),

    q('rl13',
        'When I disagree with a rule or authority figure, I...',
        'real_life', 'C',
        [
            { text: 'Follow the rule anyway—rules exist for reasons.', scores: { C: 9, A: 4, O: -5 } },
            { text: 'Question it and advocate for change.', scores: { O: 6, E: 5, C: -3 } },
            { text: 'Find creative ways to work around it.', scores: { O: 7, C: -5, E: 3 } },
            { text: 'Ignore it if I think I won\'t get caught.', scores: { C: -8, O: 3, A: -4 } },
        ]
    ),

    q('rl14',
        'My friends would describe me as...',
        'real_life', 'A',
        [
            { text: 'The one who always helps, no matter what.', scores: { A: 10, C: 3, E: 2 } },
            { text: 'Fun, energetic, and always up for adventure.', scores: { E: 8, O: 5, A: 2 } },
            { text: 'Quiet but dependable when needed.', scores: { E: -5, C: 6, A: 4 } },
            { text: 'Honest, even when the truth is hard.', scores: { A: -3, C: 6, E: 3 } },
        ]
    ),

    q('rl15',
        'When it comes to planning, I...',
        'real_life', 'C',
        [
            { text: 'Plan everything in detail well in advance.', scores: { C: 10, O: -4, N: 3 } },
            { text: 'Have a rough plan but stay flexible.', scores: { C: 4, O: 4, E: 2 } },
            { text: 'Prefer to go with the flow and improvise.', scores: { O: 6, C: -7, E: 4 } },
            { text: 'Plan only when absolutely necessary.', scores: { C: -4, O: 3, N: -2 } },
        ]
    ),
];

// ==========================================
// D&D HYPOTHETICAL QUESTIONS (~10)
// Party dynamics and moral dilemmas
// ==========================================

const DND_HYPOTHETICAL_QUESTIONS: QuizQuestion[] = [
    q('dh1',
        'Your party has captured a villain who has information about an imminent attack. They refuse to talk. What do you do?',
        'dnd_hypothetical', 'A',
        [
            { text: 'Use any means necessary to extract the information.', scores: { A: -10, C: 4, E: 4 }, classHints: ['Rogue', 'Warlock'] },
            { text: 'Try to negotiate or find common ground.', scores: { A: 6, E: 5, C: 2 }, classHints: ['Bard', 'Cleric'] },
            { text: 'Use magic to compel truth without physical harm.', scores: { C: 5, O: 4, A: -2 }, classHints: ['Wizard', 'Warlock'] },
            { text: 'Hand them to authorities—this isn\'t our call.', scores: { C: 7, A: 4, E: -3 }, classHints: ['Paladin', 'Fighter'] },
        ]
    ),

    q('dh2',
        'The party finds enough treasure to set everyone up for life. But claiming it means an NPC ally dies. What\'s your vote?',
        'dnd_hypothetical', 'A',
        [
            { text: 'Save the ally—no amount of gold is worth a life.', scores: { A: 10, C: -3, E: 3 }, classHints: ['Paladin', 'Cleric'] },
            { text: 'Take the treasure—we can honor their memory.', scores: { A: -7, C: 4, E: 2 }, classHints: ['Rogue', 'Warlock'] },
            { text: 'Try to find a third option that saves both.', scores: { O: 7, A: 5, C: 3 }, classHints: ['Bard', 'Wizard'] },
            { text: 'Let the ally decide their own fate.', scores: { C: 5, A: 3, E: -2 }, classHints: ['Monk', 'Ranger'] },
        ]
    ),

    q('dh3',
        'Another party member repeatedly makes reckless decisions that endanger the group. How do you handle it?',
        'dnd_hypothetical', 'C',
        [
            { text: 'Confront them directly in front of everyone.', scores: { E: 7, C: 4, A: -4 }, classHints: ['Fighter', 'Paladin'] },
            { text: 'Talk to them privately about your concerns.', scores: { A: 6, C: 5, E: 2 }, classHints: ['Cleric', 'Bard'] },
            { text: 'Start making backup plans for their failures.', scores: { C: 7, A: -3, E: -2 }, classHints: ['Wizard', 'Rogue'] },
            { text: 'Let them fail and learn from consequences.', scores: { C: 4, A: -4, O: 3 }, classHints: ['Monk', 'Druid'] },
        ]
    ),

    q('dh4',
        'You learn that your character\'s backstory enemy is actually trying to do good now. What do you do?',
        'dnd_hypothetical', 'O',
        [
            { text: 'Give them a chance—people can change.', scores: { O: 8, A: 6, C: -2 }, classHints: ['Cleric', 'Paladin'] },
            { text: 'Watch them closely but don\'t interfere.', scores: { C: 6, O: 3, A: -2 }, classHints: ['Ranger', 'Rogue'] },
            { text: 'Seek revenge anyway—they must pay for the past.', scores: { A: -8, E: 4, N: 5 }, classHints: ['Barbarian', 'Warlock'] },
            { text: 'Work with them if their goals align with mine.', scores: { C: 5, O: 4, A: 2 }, classHints: ['Bard', 'Fighter'] },
        ]
    ),

    q('dh5',
        'The party votes to do something you believe is morally wrong. What\'s your response?',
        'dnd_hypothetical', 'A',
        [
            { text: 'Object and try to change their minds.', scores: { A: 6, E: 5, C: 4 }, classHints: ['Paladin', 'Cleric'] },
            { text: 'Go along with it—party unity matters.', scores: { A: 5, C: 4, E: -3 }, classHints: ['Fighter', 'Bard'] },
            { text: 'Refuse to participate but don\'t stop them.', scores: { C: 6, A: 3, E: -4 }, classHints: ['Monk', 'Druid'] },
            { text: 'Actively sabotage the plan if necessary.', scores: { A: 7, C: -5, E: 3 }, classHints: ['Paladin', 'Rogue'] },
        ]
    ),

    q('dh6',
        'Your party finds a child who was raised by monsters and now behaves like one. What do you advocate for?',
        'dnd_hypothetical', 'A',
        [
            { text: 'Give them a chance to learn civilized ways.', scores: { A: 9, O: 5, C: -2 }, classHints: ['Cleric', 'Druid'] },
            { text: 'Return them to the wild—this is their nature.', scores: { O: 4, A: 2, C: 3 }, classHints: ['Ranger', 'Druid'] },
            { text: 'Find an institution that can help them.', scores: { C: 7, A: 4, E: -2 }, classHints: ['Paladin', 'Cleric'] },
            { text: 'They\'re too dangerous—we shouldn\'t risk it.', scores: { A: -6, C: 5, N: 4 }, classHints: ['Fighter', 'Rogue'] },
        ]
    ),

    q('dh7',
        'A powerful magic item would help the party, but using it requires a morally questionable act. Do you support using it?',
        'dnd_hypothetical', 'C',
        [
            { text: 'The ends justify the means. Use it.', scores: { C: -5, O: 4, A: -4 }, classHints: ['Warlock', 'Rogue'] },
            { text: 'Only if we\'re completely out of options.', scores: { C: 5, A: 3, O: 2 }, classHints: ['Fighter', 'Ranger'] },
            { text: 'Never—there\'s always another way.', scores: { A: 7, C: 6, O: -3 }, classHints: ['Paladin', 'Monk'] },
            { text: 'Research if we can use it differently.', scores: { O: 6, C: 4, A: 2 }, classHints: ['Wizard', 'Bard'] },
        ]
    ),

    q('dh8',
        'Your party must split up. Who do you go with?',
        'dnd_hypothetical', 'E',
        [
            { text: 'The group that will see the most action.', scores: { E: 7, O: 4, N: -4 }, classHints: ['Fighter', 'Barbarian'] },
            { text: 'Whoever needs my skills the most.', scores: { A: 6, C: 5, E: -2 }, classHints: ['Cleric', 'Bard'] },
            { text: 'The smaller, stealthier group.', scores: { E: -5, C: 5, O: 3 }, classHints: ['Rogue', 'Ranger'] },
            { text: 'I volunteer to go alone.', scores: { E: -8, C: 4, O: 4 }, classHints: ['Ranger', 'Monk'] },
        ]
    ),

    q('dh9',
        'You discover a way to gain immense power, but it requires sacrificing a piece of your humanity. What do you do?',
        'dnd_hypothetical', 'N',
        [
            { text: 'Accept—power is worth the cost.', scores: { O: 5, A: -6, N: -4 }, classHints: ['Warlock', 'Sorcerer'] },
            { text: 'Refuse—some prices are too high.', scores: { A: 6, C: 6, O: -4 }, classHints: ['Paladin', 'Monk'] },
            { text: 'Study it more to understand the true cost.', scores: { C: 6, O: 5, N: 3 }, classHints: ['Wizard'] },
            { text: 'Destroy it so no one can be tempted.', scores: { A: 7, C: 4, O: -5 }, classHints: ['Cleric', 'Paladin'] },
        ]
    ),

    q('dh10',
        'The campaign is ending. How do you want your character\'s story to conclude?',
        'dnd_hypothetical', 'O',
        [
            { text: 'A heroic sacrifice to save others.', scores: { A: 8, E: 4, N: 3 }, classHints: ['Paladin', 'Fighter'] },
            { text: 'Settling down and finding peace at last.', scores: { N: -5, C: 5, A: 4 }, classHints: ['Druid', 'Cleric'] },
            { text: 'Continuing to adventure—the story never ends.', scores: { O: 9, E: 5, C: -3 }, classHints: ['Bard', 'Rogue'] },
            { text: 'Becoming a legend through my achievements.', scores: { E: 7, O: 4, A: -2 }, classHints: ['Fighter', 'Wizard'] },
        ]
    ),
];

// ==========================================
// COMBINED QUESTION POOL
// ==========================================

/** All questions combined */
export const ALL_QUESTIONS: QuizQuestion[] = [
    ...FANTASY_QUESTIONS,
    ...REALLIFE_QUESTIONS,
    ...DND_HYPOTHETICAL_QUESTIONS,
];

/** Get questions by category */
export function getQuestionsByCategory(category: 'fantasy_scenario' | 'real_life' | 'dnd_hypothetical'): QuizQuestion[] {
    return ALL_QUESTIONS.filter(q => q.category === category);
}

/** Get questions by primary dimension */
export function getQuestionsByDimension(dimension: BigFiveDimension): QuizQuestion[] {
    return ALL_QUESTIONS.filter(q => q.dimension === dimension);
}

/** 
 * Select questions for a quiz session
 * Returns a balanced mix of categories and dimensions
 */
export function selectQuestionsForSession(count: number = 15): QuizQuestion[] {
    // Ensure we get a good distribution
    const fantasy = FANTASY_QUESTIONS.slice();
    const realLife = REALLIFE_QUESTIONS.slice();
    const dnd = DND_HYPOTHETICAL_QUESTIONS.slice();

    // Shuffle each category
    shuffle(fantasy);
    shuffle(realLife);
    shuffle(dnd);

    const selected: QuizQuestion[] = [];

    // Take roughly: 8 fantasy, 5 real-life, 2 D&D hypothetical for 15 questions
    const fantasyCount = Math.floor(count * 0.53);  // ~8
    const realLifeCount = Math.floor(count * 0.33); // ~5
    const dndCount = count - fantasyCount - realLifeCount; // ~2

    selected.push(...fantasy.slice(0, fantasyCount));
    selected.push(...realLife.slice(0, realLifeCount));
    selected.push(...dnd.slice(0, dndCount));

    // Final shuffle so categories are mixed
    shuffle(selected);

    // Verify dimension coverage (at least one question per dimension)
    const dimensions = new Set(selected.map(q => q.dimension));
    const allDimensions: BigFiveDimension[] = ['O', 'C', 'E', 'A', 'N'];

    for (const dim of allDimensions) {
        if (!dimensions.has(dim)) {
            // Find a question with this dimension and swap it in
            const replacement = ALL_QUESTIONS.find(q =>
                q.dimension === dim && !selected.some(s => s.id === q.id)
            );
            if (replacement) {
                // Replace a random question (not the first few to maintain variety)
                const replaceIndex = Math.floor(Math.random() * (selected.length - 5)) + 5;
                selected[replaceIndex] = replacement;
            }
        }
    }

    return selected;
}

/** Fisher-Yates shuffle */
function shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/** Get a specific question by ID */
export function getQuestionById(id: string): QuizQuestion | undefined {
    return ALL_QUESTIONS.find(q => q.id === id);
}
