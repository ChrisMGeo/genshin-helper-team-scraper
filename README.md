# genshin-helper-data-scraper

Make sure to get a `credentials.json` from Google Console API, and share the sheet specified in spreadsheetId in `index.ts` to your account.

## How to update builds?

```bash
# run this to install npm packages
$ npm install

# run this to update consts.ts and global.d.ts
$ npm run update

# run this if u want to develop index.ts
$ npm run dev
# OR
# run this if you want to just compile without developing
$ npx tsc

# run this to update the builds json
$ npm run start
# It'll ask you to input CharacterKey for CHILDE
# this is because we classify Childe under Tartaglia
# so type in Tartaglia (there is autocomplete support using tab,
# incase you're unsure about Spelling)
# Builds will be outputted to GHTCommunityBuilds.json
```

## Format for JSON

Here are the important parts of the format, you can ignore the rest.

```JSON
{
	"$characterKey": {
		"characterKey":"$characterKey", // Character Keys are either
		// described in consts.ts under nonTravelerKeys or is Traveler
		"notes":"$notes", // Refers to the entire notes rowfor a character
		"builds":[ //  Array of builds
			{
				"name": "$buildName",  // Name of the specific build, e.g. DPS, Support
				"weapons":[ // Array of weapons.
				// Keys are described in consts.ts under allWeaponKeys (allWeaponSwordKeys, etc.)
					"$weaponKey", //you can describe a weapon
					// with no notes and no min refinements with just it's key

					// Detailed weapon object with notes
					// and a minRefinement (a number not a string)
					{"key":"$weaponKey", "notes":"$weaponNotes", "minRefinement":1}
				],
				"artifactSets":[ // Similar to weapons but they don't have minRefinement and
				// multiple artifact sets can be grouped under an array
					"$artifactSetKey",
					["CrimsonWitchOfFlames", "WanderersTroupe"], // 2pc cw and 2 pc wt
					// Choose two between these 3
					["CrimsonWitchOfFlames", "WanderersTroupe", "GladiatorsFinale"]
				],
				"notes":"$buildNotes" // NOT notes regarding weapons and artifacts under a build but rather playstyle and general stuff
			}
		]
	}
}
```

Most of it will be generated from `npm run start`, and you usually only need to change `weapons` and `artifactSets`. Running `npm run start` also updates builds (**NOTE**: When the sheet changes weapons, artifacts or even the notes of a character, the `weapons` and `artifactSets` are reverted to an empty array.), if weapons or artifacts change for a build, it notifies you when it does:

```
Weapons Changed for Fischl electro DPS
                ["SkywardHarp"]
Artifacts Changed for Fischl electro DPS
                ["PaleFlame"]
Weapons Changed for Fischl electro OFF-FIELD DPS ✩
                ["Polar Star"]
Artifacts Changed for Fischl electro OFF-FIELD DPS ✩
                ["ThunderingFury"]
```

The arrays logged above are actually the previously written `weapons` and `artifactSets` for the character, so if you feel as though only a minor change occured that doesn't justify it being empty, you can copy back in what was in the console output back to the JSON.
