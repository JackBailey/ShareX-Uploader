# A ExpressJS Application to shorten URLS and Host Images

Compatible with ShareX

## Config

#### **`data.json`**

```
{}
```

#### **`config.json`**

```
{
	"domain": "http://localhost:8080",
	"port": 8080,
	"files": {
		"maxSize": 100,
		"chars": ["LOWERCASE", "UPPERCASE","NUMBERS"],
		"length": 5
	},
	"urls": {
		"length": 6
	},
	"index": {
		"title": "My Host",
		"color": "#662aac",
		"embed": false
	}
}

```

#### **`.env`**

```
KEY=secretKey
```

Get your ShareX config at `example.com/config/KEY-SET-IN-ENV`
