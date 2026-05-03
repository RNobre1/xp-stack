# Mermaid Patterns pra Fluxo de Controle

## if / else simples

```javascript
if (x > 0) {
  doA();
} else {
  doB();
}
return result;
```

```mermaid
flowchart TD
  Start([Start]) --> Check{x > 0?}
  Check -- yes --> A[doA]
  Check -- no --> B[doB]
  A --> Result([Return result])
  B --> Result
```

## if sem else (early return)

```javascript
if (!user) {
  return null;
}
return user.name;
```

```mermaid
flowchart TD
  Start([Start]) --> Check{user existe?}
  Check -- no --> Null([Return null])
  Check -- yes --> Name([Return user.name])
```

## switch / match

```javascript
switch (kind) {
  case 'A': return doA();
  case 'B': return doB();
  default: throw new Error('unknown');
}
```

```mermaid
flowchart TD
  Start([Start]) --> Switch{kind}
  Switch -- A --> A[doA]
  Switch -- B --> B[doB]
  Switch -- default --> Throw([Throw unknown]):::error
  A --> EndA([Return])
  B --> EndB([Return])
  classDef error fill:#fee,stroke:#c00
```

## loop com condicao de saida

```javascript
while (queue.length) {
  const item = queue.shift();
  process(item);
  if (item.kind === 'stop') break;
}
return done;
```

```mermaid
flowchart TD
  Start([Start]) --> Cond{queue tem items?}
  Cond -- yes --> Shift[Shift item]
  Shift --> Proc[Process item]
  Proc --> CheckStop{kind === stop?}
  CheckStop -- yes --> Done([Return done])
  CheckStop -- no --> Cond
  Cond -- no --> Done
```

## try / catch

```javascript
try {
  await fetchData();
} catch (err) {
  logError(err);
  return null;
}
return data;
```

```mermaid
flowchart TD
  Start([Start]) --> Try[Await fetchData]
  Try -- ok --> Result([Return data])
  Try -- throws --> Log[logError]
  Log --> Null([Return null])
```

## external state dependency

```javascript
if (await isAdmin(user)) {
  return adminView();
}
return userView();
```

```mermaid
flowchart TD
  Start([Start]) --> Check{await isAdmin user}
  Check -- true --> Admin([Return adminView])
  Check -- false --> User([Return userView])
```

## side effects (anotar como nota)

```javascript
await db.users.create(user);
await emailQueue.send(user.email);
return user;
```

```mermaid
flowchart TD
  Start([Start]) --> Db[(DB write: users.create)]:::sideeffect
  Db --> Email[(Side effect: emailQueue.send)]:::sideeffect
  Email --> Return([Return user])
  classDef sideeffect fill:#fee,stroke:#c66
```
