# CodeLine

CodeLine is a classroom web application where students turn an algorithm in plain words into code by placing code snippets next to pseudocode.
It is the software version of a paper exercise in which each student held one cut-out line of a program.

## Language

### People and courses

**Lecturer**:
The teacher of a Course, who writes its Exercises and runs its Sessions.
_Avoid_: Professor, instructor, teacher, Ajarn

**Teaching assistant**:
A helper who runs Sessions for the Courses they assist, and can read every Course's results, but cannot write Exercises.
_Avoid_: TA in written text, assistant, helper

**Student**:
A person enrolled in a Course who plays its Sessions.
_Avoid_: Player, learner, user

**Course**:
A programming course the department offers, in any programming language, with its own Exercises and its own list of enrolled students.
_Avoid_: Class, subject

**Join code**:
A Course's code, shown on the projector, which a Student enters once to enrol in that Course.
_Avoid_: PIN, invite code, session code

### Exercises

**Exercise**:
A program prepared beforehand by the lecturer of a course: its pseudocode, split into Slots, and its solution code, split into Snippets.
_Avoid_: Question, problem, puzzle

**Slot**:
The blank beside one pseudocode step, where exactly one Snippet belongs.
_Avoid_: Blank, position, step

**Given Slot**:
A Slot shown already filled with its Snippet, which is never dealt to students, such as a closing brace or the class header.
_Avoid_: Fixed line, locked line, template line

**Snippet**:
One line of an Exercise's solution code, with one fixed correct Slot.
_Avoid_: Line, code statement, card

### Play

**Session**:
One live classroom run of a Course, opened by the lecturer, made of one or more Rounds.
_Avoid_: Game, class, lesson

**Round**:
One Exercise played inside a Session, ending when its time limit runs out or every student has placed every Snippet in their Hand.
_Avoid_: Level, stage, question

**Hand**:
The Snippets dealt to one student in a Round; its size is set by the lecturer, and a Hand of one is the paper version.
_Avoid_: Deck, tray

**Board**:
One student's own copy of the Exercise, on which that student places the Snippets in their Hand.
_Avoid_: Program, workspace

**Class Board**:
The projector view that combines every student's Board, showing which Slots the class has filled correctly and how many students got each one right.
_Avoid_: Shared board, main screen

**Placement**:
A student's decision to put one Snippet in one Slot, judged right or wrong against the Snippet's fixed Slot, with an optional reason.
_Avoid_: Answer, move, attempt

**Team**:
A group of students drawn at random and balanced in size by CodeLine for one Session played in teams, scored by its members' average.
_Avoid_: Group, squad

**Spotlight**:
The lecturer featuring one student's reason for a Placement on the projector, which earns that student bonus Points.
_Avoid_: Highlight, shout-out

### Progression

**Points**:
What a student earns for correct Placements within one Session, ranked on that Session's leaderboard and reset when it ends.
_Avoid_: Score, marks, grade

**XP**:
A student's lifetime total of Points across all Sessions, which never resets and decides their Level.
_Avoid_: Experience, total score

**Level**:
A student's rank on the XP ladder, which unlocks cosmetic items for their avatar.
_Avoid_: Rank, tier

**Badge**:
A lasting award for one specific feat, such as finishing a Round with no retries.
_Avoid_: Achievement, trophy, medal

**Almanac**:
A student's collection of the Exercises they have completed a Round of, grouped by language.
_Avoid_: Collection, codex, portfolio
