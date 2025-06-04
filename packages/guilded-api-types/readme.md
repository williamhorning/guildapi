![GAPI](https://raw.githubusercontent.com/williamhorning/guildapi/main/assets/logo.svg)

# @jersey/guilded-api-types

guilded-api-types is a package providing types for
[Guilded](https://guilded.gg)'s API.

## usage

you can use the types in this package by doing the following;

```ts
import type { User } from 'jsr:@jersey/guilded-api-types';

let user: User = {
	createdAt: '2022-02-26T21:22:44.047Z',
	id: '4ornxlYA',
	name: 'Jersey',
	// Type 'boolean' is not assignable to type 'string'
	avatar: true,
};
```
