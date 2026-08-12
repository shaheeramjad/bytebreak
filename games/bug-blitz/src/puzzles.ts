import type { SupportedLanguage } from '@bytebreak/shared';

export interface BugPuzzle {
  id: string;
  language: SupportedLanguage;
  title: string;
  /** Code shown to player — synthetic, never from user projects */
  code: string;
  /** 1-based line numbers that contain the bug */
  bugLines: number[];
  /** Acceptable explanations (normalized match) */
  explanations: string[];
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  hint: string;
}

/**
 * Curated synthetic puzzles only.
 * Privacy: never load or reference real user repositories.
 */
export const PUZZLES: BugPuzzle[] = [
  {
    id: 'js-off-by-one',
    language: 'javascript',
    title: 'Off-by-one in loop',
    difficulty: 'easy',
    hint: 'Check loop bounds',
    code: `function sum(arr) {
  let total = 0;
  for (let i = 0; i <= arr.length; i++) {
    total += arr[i];
  }
  return total;
}`,
    bugLines: [3],
    explanations: ['off-by-one', '<=', 'length', 'out of bounds', 'undefined'],
  },
  {
    id: 'ts-async-race',
    language: 'typescript',
    title: 'Missing await',
    difficulty: 'medium',
    hint: 'Async function returns a Promise',
    code: `async function loadUser(id: string) {
  const res = fetch(\`/api/users/\${id}\`);
  const data = await res.json();
  return data;
}`,
    bugLines: [2],
    explanations: ['await', 'missing await', 'promise', 'fetch'],
  },
  {
    id: 'py-mutable-default',
    language: 'python',
    title: 'Mutable default argument',
    difficulty: 'medium',
    hint: 'Default args are evaluated once',
    code: `def append_item(item, items=[]):
    items.append(item)
    return items

print(append_item(1))
print(append_item(2))`,
    bugLines: [1],
    explanations: ['mutable default', 'default argument', 'shared list', 'items=[]'],
  },
  {
    id: 'go-closure-loop',
    language: 'go',
    title: 'Loop variable capture',
    difficulty: 'hard',
    hint: 'Goroutines capture loop variables',
    code: `func main() {
  var wg sync.WaitGroup
  for i := 0; i < 3; i++ {
    wg.Add(1)
    go func() {
      defer wg.Done()
      fmt.Println(i)
    }()
  }
  wg.Wait()
}`,
    bugLines: [5, 7],
    explanations: ['closure', 'loop variable', 'capture', 'goroutine', 'i'],
  },
  {
    id: 'rust-borrow',
    language: 'rust',
    title: 'Use after move',
    difficulty: 'hard',
    hint: 'Ownership moves on push',
    code: `fn main() {
    let s = String::from("hello");
    let mut v = Vec::new();
    v.push(s);
    println!("{}", s);
}`,
    bugLines: [5],
    explanations: ['move', 'ownership', 'borrow', 'use after move', 's'],
  },
  {
    id: 'java-equals',
    language: 'java',
    title: 'String comparison with ==',
    difficulty: 'easy',
    hint: 'Reference vs value equality',
    code: `public boolean isAdmin(String role) {
    return role == "admin";
}`,
    bugLines: [2],
    explanations: ['==', 'equals', 'string comparison', 'reference'],
  },
  {
    id: 'cs-async-void',
    language: 'csharp',
    title: 'async void exception sink',
    difficulty: 'medium',
    hint: 'Exceptions in async void are hard to catch',
    code: `public async void SaveAsync() {
    await db.SaveChangesAsync();
}`,
    bugLines: [1],
    explanations: ['async void', 'task', 'exception', 'async task'],
  },
  {
    id: 'sql-injection',
    language: 'sql',
    title: 'String-concatenated query',
    difficulty: 'medium',
    hint: 'Never concatenate user input into SQL',
    code: `-- app builds:
-- "SELECT * FROM users WHERE name = '" + name + "'"
SELECT * FROM users WHERE name = 'Alice'; -- example`,
    bugLines: [2],
    explanations: ['injection', 'concatenate', 'parameterized', 'prepared statement'],
  },
  {
    id: 'docker-root',
    language: 'docker',
    title: 'Running as root',
    difficulty: 'easy',
    hint: 'Least privilege in containers',
    code: `FROM node:20
WORKDIR /app
COPY . .
RUN npm ci
CMD ["node", "server.js"]`,
    bugLines: [1, 4, 5],
    explanations: ['root', 'user', 'non-root', 'security', 'USER'],
  },
  {
    id: 'yaml-indent',
    language: 'yaml',
    title: 'Broken indentation',
    difficulty: 'easy',
    hint: 'YAML is indentation-sensitive',
    code: `services:
  api:
    image: api:latest
  ports:
      - "8080:8080"`,
    bugLines: [4],
    explanations: ['indent', 'indentation', 'ports', 'structure'],
  },
  {
    id: 'ts-null-deref',
    language: 'typescript',
    title: 'Possible null dereference',
    difficulty: 'easy',
    hint: 'Optional chaining or guard',
    code: `function greeting(user?: { name: string }) {
  return "Hello, " + user.name;
}`,
    bugLines: [2],
    explanations: ['null', 'undefined', 'optional', 'user?', 'guard'],
  },
  {
    id: 'js-float-money',
    language: 'javascript',
    title: 'Floating point money',
    difficulty: 'medium',
    hint: 'Binary floats are imprecise',
    code: `function addMoney(a, b) {
  return a + b;
}
// addMoney(0.1, 0.2) === 0.3 ?`,
    bugLines: [2],
    explanations: ['float', 'precision', 'decimal', 'money', '0.1'],
  },
];

export function selectPuzzle(
  language: SupportedLanguage,
  difficulty: string,
  seed: string,
): BugPuzzle {
  const pool = PUZZLES.filter(
    (p) => p.language === language || language === 'typescript' /* fallback pool */,
  );
  const byDiff = pool.filter((p) => p.difficulty === difficulty);
  const candidates = byDiff.length ? byDiff : pool.length ? pool : PUZZLES;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return candidates[hash % candidates.length]!;
}
