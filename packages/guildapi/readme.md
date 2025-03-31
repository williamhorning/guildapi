![GAPI](https://raw.githubusercontent.com/williamhorning/guildapi/main/assets/logo.svg)

# GuildAPI - _A Typescript library for the Guilded API_

## Example

```ts
import { createClient } from 'jsr:@jersey/guildapi';

const client = createClient('<insert token>');

client.bonfire.on('CreateMessage', console.log);

client.request('post', `/channels/{channel}/messages`, { content: 'hello' });
```
