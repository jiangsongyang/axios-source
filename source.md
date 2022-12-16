---
theme: condensed-night-purple
highlight: a11y-dark
---


# 手把你带你调试 Axios 源码

大家好 ，我是阿阳 ，想必大家在日常的开发中必然少不了使用 axios , axios 作为前端最常用的请求库，怎么能少的了对其原理的了解！快来阅读这篇文章掌握学习 axios 源码的正确姿势吧！

首先我们需要去 github clone 一份 axios 的源码

```bash
git clone https://github.com/axios/axios.git
```

clone 好了之后 就可以开始我们今天的学习了～

# 开始学习

首先想学会看源码 , 我个人的经验一般都是先看 package.json 。 package.json 除了一些常见的字段之外 ， 还有一些工程化相关的字段 ，了解这些字段可以帮助我们更好的理解源码。

## 分析 package.json

```javascript
{
  // 包名
  "name": "axios",
  // 版本
  "version": "1.2.1",
  // 描述
  "description": "Promise based HTTP client for the browser and node.js",
  // 入口文件
  "main": "index.js",
  // 为不同的环境和 JavaScript 风格的包模块
  "exports": {
    ".": {
      "types": {
        "require": "./index.d.cts",
        "default": "./index.d.ts"
      },
     // ...
    },
    "./package.json": "./package.json"
  },
  // esm
  "type": "module",
  // 类型声明入口文件
  "types": "index.d.ts",
  // 项目脚本
  "scripts": {
    ...
  },
  // 仓库信息
  "repository": {
    "type": "git",
    "url": "https://github.com/axios/axios.git"
  },
  // 关键词 用于 npm 搜索
  "keywords": [
    "xhr",
    "http",
  	// ...
  ],
  // 作者信息
  "author": "Matt Zabriskie",
  // 协议
  "license": "MIT",
  // issue 地址
  "bugs": {
    "url": "https://github.com/axios/axios/issues"
  },
  // github 的 pages 服务地址
  "homepage": "https://axios-http.com",
  // 开发以来
  "devDependencies": {
		...
	},
	// type声明成 esm , 但是没配置 module ... 不知道配这个有啥用
  "browser": {
    "./lib/adapters/http.js": "./lib/helpers/null.js",
    "./lib/platform/node/index.js": "./lib/platform/browser/index.js"
  },
  // cdn库地址
  "jsdelivr": "dist/axios.min.js",
  // 指定 cdn 访问资源路径
  "unpkg": "dist/axios.min.js",
  // typescript 入口文件
  "typings": "./index.d.ts",
  // 生产依赖
  "dependencies": {
   	// ...
  },
  // 给构建工具用的 监听bundle大小的
  "bundlesize": [
    {
      "path": "./dist/axios.min.js",
      "threshold": "5kB"
    }
  ],
  // 大佬们的主页 这里就不省略了
  "contributors": [
    "Matt Zabriskie (https://github.com/mzabriskie)",
    "Nick Uraltsev (https://github.com/nickuraltsev)",
    "Jay (https://github.com/jasonsaayman)",
    "Dmitriy Mozgovoy (https://github.com/DigitalBrainJS)",
    "Emily Morehouse (https://github.com/emilyemorehouse)",
    "Rubén Norte (https://github.com/rubennorte)",
    "Justin Beckwith (https://github.com/JustinBeckwith)",
    "Martti Laine (https://github.com/codeclown)",
    "Xianming Zhong (https://github.com/chinesedfan)",
    "Rikki Gibson (https://github.com/RikkiGibson)",
    "Remco Haszing (https://github.com/remcohaszing)",
    "Yasu Flores (https://github.com/yasuf)",
    "Ben Carp (https://github.com/carpben)",
    "Daniel Lopretto (https://github.com/timemachine3030)"
  ],
  // 这个包不包含副作用 , 可以 tree shaking
  "sideEffects": false,
  // release-it 相关配置 用于 release
  "release-it": {
    // ...
    "hooks": {
      "before:init": "npm test",
      "after:bump": "gulp version && npm run build",
      "after:release": "echo Successfully released ${name} v${version} to ${repo.repository}."
    }
  },
  // 用于约束 提交信息
  "commitlint": {
    "extends": [
      "@commitlint/config-conventional"
    ]
  }
}

```

## 准备调试环境

看的差不多了 开始安装依赖

发现他 package.json 中并没有约束包管理工具相关信息 但是发现了他跟目录下有 `package-lock.json` 所以盲猜直接 `npm i` 。 依赖就安装完成了。

我的环境信息

```javascript
➜  axios-source git:(v1.x) node -v
v16.13.0
➜  axios-source git:(v1.x) npm -v
8.1.0
```

然后跑一下 npm run dev 看一下效果


![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/edd6f1d6f79443998fca3255811cb2c0~tplv-k3u1fbpfcp-watermark.image?)

让我们来看下这个命令都做了什么

他跑了 sandbox 目录下的 server.js

```javascript
server = http.createServer(function (req, res) {
  if (pathname === "/") {
    pathname = "/index.html";
  }
  if (pathname === "/index.html") {
    // 默认访问到这里
    pipeFileToResponse(res, "./client.html");
  }
  // ...
});

const PORT = 3000;
// 启动服务在 3000
server.listen(PORT, console.log(`Listening on localhost:${PORT}...`));
// error 相关
server.on("error", (error) => {});
```

就找到了 client.html 发现里面访问了 axios

```html
<script src="/axios.js"></script>
```

就访问到

```javascript
else if (pathname === '/axios.js') {
  pipeFileToResponse(res, '../dist/axios.js', 'text/javascript');
} else if (pathname === '/axios.map') {
  pipeFileToResponse(res, '../dist/axios.map', 'text/javascript');
}
```

找到了 demo 中的 axios 源码 bundle 我们就可以开始调试了

但是发现 没有 sourcemap 我们需要打包出一份带着 map 的 axios

我们咋能知道 axios 咋打包的呢？（有的同学要说 npm run build 呗 , `这只是经验 不一定准确` 要合理分析出来）

```javascript
"release-it": {
  "hooks": {
    "before:init": "npm test",
     // 在这
    "after:bump": "gulp version && npm run build",
    "after:release": "echo Successfully released ${name} v${version} to ${repo.repository}."
  }
}
```

他先跑了 `test` , 在所有的单测都通过的前提下 他开始生成 `version` 和 `build` , 这些都完成了 他就输出成功 release

看看 build 做了啥

```javascript
"build": "gulp clear && cross-env NODE_ENV=production rollup -c -m",
```

就是用 production 模式 rollup -c 了一下 , 正好他 -m 了（-m 生成 sourcemap）。我们只需要跑一下 build 就生成 map 了

打包前

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d2d5afda4f7546d6894658a2649e43b1~tplv-k3u1fbpfcp-watermark.image?)

打包后

![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/111878ab4ae344bbb63772f986dd6a63~tplv-k3u1fbpfcp-watermark.image?)

但是我们发现了点问题，发现映射的是 bundle 的 map

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/61b65eb5cdf14d758086044af2abcff7~tplv-k3u1fbpfcp-watermark.image?)

这样虽然也能调试 ，但是对调试的观感不太好。我们最好能映射到工程里，这样就可以按照目录来调试源码了。

点击调试面板 创建调试配置

![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8bab125b497749db83111bd48f80658a~tplv-k3u1fbpfcp-watermark.image?)

```javascript
// launch.json
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "pwa-chrome",
            "request": "launch",
            "name": "Launch Chrome against localhost",
            "url": "http://localhost:3000",
            "webRoot": "${workspaceFolder}/dist"
        }
    ]
}
```

配置成这样 点击调试面板中的开始按钮 如果能成功展示出一个 chrome 窗口 就证明可以链接本地工程进行调试了

![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/724ddd42ba184cb0933c99f609e5f762~tplv-k3u1fbpfcp-watermark.image?)

我们在入口文件 axios.js 中 找到 axios 创建的地方 打上断点

![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8658bb97cc194b35a528735e4d0bcec8~tplv-k3u1fbpfcp-watermark.image?)

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e589aabc82e4450d8e89cfd23e0b1f11~tplv-k3u1fbpfcp-watermark.image?)

我们就可以愉快的在本地调试源码啦～

## 正式分析 axios

### 初始化

#### 1. 创建 axios 上下文

```javascript
const context = new Axios(defaultConfig);
```

我们先不关注 defaultConfig 里面是什么 等用到时候再具体分析

看了一下这个构造函数 只是初始化了点东西 先跳过

![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/467ac2c9f54a42528562bdfc68c687a8~tplv-k3u1fbpfcp-watermark.image?)

#### 2. 构造一个新的 axios 实例 ，并将 axios 实例的 request 方法中的 this 指向刚刚创建的上下文

```javascript
const instance = bind(Axios.prototype.request, context);
```

![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/1fcca65be87847a5bb4446058cd1beb9~tplv-k3u1fbpfcp-watermark.image?)

这里 bind 方法做了个闭包，

#### 3. 将 Axios 构造函数的原型拓展到 上下文上

```javascript
utils.extend(instance, Axios.prototype, context, { allOwnKeys: true });
```

#### 4. 将 上下文 中的配置同步到 axios 实例中

```javascript
utils.extend(instance, context, null, { allOwnKeys: true });
```

#### 5. 给实例添加 create 方法

方法实现是重新调用一次 createInstance , 将用户的 config 和 defaultConfig 合并一下

```javascript
instance.create = function create(instanceConfig) {
  return createInstance(mergeConfig(defaultConfig, instanceConfig));
};
```

#### 初始化总结

通过上面几步可以回答以下几个问题

##### Q: axios 为什么可以花式调用

A : 我们常见的调用方式有 `axios.get` , `axios(config).get()`, `axios.create().get()` 。

axios 首先通过 `bind` 方法做了一个新的函数 , 所以 `我们调用的 axios 本质就是这个 bind 方法返回的函数` 并且通过`将原型合并给这个函数`的方式 实现一些静态方法调用。最后通过打补丁的方法实现了`create`方法。

### 运行时

我们回到官方给的 demo 里

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/01edfb0bc549427c9754b2277863967c~tplv-k3u1fbpfcp-watermark.image?)

就调试这个 demo , 通过初始化我们知道 axios 之所以可以被调用 是因为在初始化阶段通过 `bind` 函数做了个闭包。 所以在 bind 函数内部打个断点。

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/76a4d424055e4cb5aa175aafe4001838~tplv-k3u1fbpfcp-watermark.image?)

点击 demo 中的 Send Request 按钮 , 进入到我们的断点里

![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/85ec6ac7f3e7487c8bdb24b024280d7c~tplv-k3u1fbpfcp-watermark.image?)

继续往下走，走到了 Axios 构造函数的 request 方法

#### request 方法

##### 1. 处理参数

request 方法首先对参数类型进行处理 判断如果参数是 string 直接当成 url 处理

![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c0eddf98e1154cb3869751f80e034caa~tplv-k3u1fbpfcp-watermark.image?)

##### 2. 合并用户配置和默认配置

![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ce65b7e1e09a4eacaf078d2eaae0cb5c~tplv-k3u1fbpfcp-watermark.image?)

##### 3. 验证了点啥

不知道在验证个啥， 先不看 , 不钻牛角尖 Ï

![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/33e624fb97084c9fb69e0d6122bb8189~tplv-k3u1fbpfcp-watermark.image?)

##### 4. 修正请求的 method

在这里我们可以看到关于 `method 的优先级`。

`配置 > 默认` , 是在不行就用 `get`

![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d9c7081fa7c84eed8ffa7ff9f53480d0~tplv-k3u1fbpfcp-watermark.image?)

##### 5. 给配置添加请求头

``` javascript
// 给 配置 添加 headers
config.headers = AxiosHeaders.concat(contextHeaders, headers);
```

##### 6. 处理请求拦截器

由于我们的 demo 里没有拦截器 。 就可以先不分析。标记 TODO , 一会分析。

##### 7. 发送请求

![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2eb8b36fe15e4f51bb9dd964a668d800~tplv-k3u1fbpfcp-watermark.image?)
这里执行了 `dispatchRequest` 方法 ， 核心方法。

##### 8. 执行响应拦截器

同理 暂时不需要分析。

接下来开始分析 dispatchRequest 这个方法

### dispatchRequest 方法

##### 1. 处理了一个边缘 case

​ 判断这个请求被没被取消掉

```javascript
throwIfCancellationRequested(config);
```

##### 2. 设置 headers

```javascript
config.headers = AxiosHeaders.from(config.headers);
```

##### 3. 转换请求 data

我们这个 demo 里没有 data 所以暂不分析

```javascript
config.data = transformData.call(config, config.transformRequest);
```

##### 4. 针对特殊的 method 添加请求头

```javascript
if (["post", "put", "patch"].indexOf(config.method) !== -1) {
  config.headers.setContentType("application/x-www-form-urlencoded", false);
}
```

##### 5. 获取适配器

重点方法。通过 config 中 adapter 获取当前的适配器

```javascript
const adapter = adapters.getAdapter(config.adapter || defaults.adapter);
```

##### 6. 通过适配器来发起请求

```javascript
return adapter(config).then(function onAdapterResolution(response) {
	// ...
}
```

##### 7. 拿到响应数据 进行转换

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/63aba0a226bb4519949fcbdc049a4848~tplv-k3u1fbpfcp-watermark.image?)

##### 8. 设置响应头

```javascript
response.headers = AxiosHeaders.from(response.headers);
```

##### 9. 返回响应结果

```javascript
return response;
```

#### 适配器

axios 使用适配器一个很优秀的设计, 这样可以让自身脱离平台的限制。

举个例子

在 web 端 , 我们经常使用 xhr 用来做 ajax 请求 。 但是在 node 里 我们没有 xhr 。我们的请求需要通过 http 模块来实现 。在不同的场景需要做同一件事， 这种场景使用适配器再合适不过了。

我们可以再举个例子

Vue3 的自定义渲染器 ，开发者只需要提供 vue 所需要的接口 即可以实现在任何端的渲染 , 想比于 vue2 ，不仅对于框架实现者的成本降低了， 不用考虑平台相关属性，而且对于做跨端的开发者也容易了起来。因为不在需要知道 vue 内部实现 , 只需要知道我给 vue 提供这个接口 vue 就可以帮开发者做好渲染相关工作。

我们来看看 axios 是如何加载适配器的

##### 加载适配器

![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/aab82ee5567845d088d0e0f76c1412a0~tplv-k3u1fbpfcp-watermark.image?)

从代码中我们可以看到，获取适配器方法其实很简单 ，如果配置类型是 string ，就去适配器表中取出第一个匹配的适配器 。 如果是用户传入的东西直接当成适配器即可

axios 内置支持了两种适配器

![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/0d6b47b4da2741e59df4940aa3995ae5~tplv-k3u1fbpfcp-watermark.image?)

1. 基于 xhr 的 - `用于 browser`
2. 基于 http 模块的 - `用于 node`

![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9c8717fcfa63471580460316fa10b745~tplv-k3u1fbpfcp-watermark.image?)

##### 适配器的实现

这两种适配器具体的实现就不在这里过多展开了。

xhr 就是老四步 , http 就是 node:http 。 如果感兴趣可以自行去查看 axios 的实现。

#### 拦截器

我们先去改造一下我们的 demo

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/42e8ddc1cfa441c8a158796b5ea58499~tplv-k3u1fbpfcp-watermark.image?)

在这里我添加了一个请求拦截器和一个响应拦截器，我们先看拦截器都是如何注册的。

##### 注册拦截器

可以观察到 , 拦截器的注册通过 `use` 方法。 在 axios 初始化阶段我们看到了 interceptors 初始化方法 , 我们看下其对应 use 方法的实现

![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c858332118f04391b1fe8a21bad1f5fe~tplv-k3u1fbpfcp-watermark.image?)

其实就是把我们注册的函数存起来 , `做了一个发布订阅`。

##### 拦截器如何生成拦截任务

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/778da3d878ed43cfb910ba17bfec1317~tplv-k3u1fbpfcp-watermark.image?)

axios 对注册的请求拦截器进行遍历 。 判断他们的执行时机 , 是否需要执行。 判断有没有同步拦截器。最后推到 任务队列里 等着被调度


##### 准备就绪 开始调度任务

![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/51fe652ea5764c7aaa441271ba5d34fa~tplv-k3u1fbpfcp-watermark.image?)

axios 首先构建了个任务队列 , 把请求主体任务放进去了。 但是有个小问题 , 为啥他要同时推个 `undefined` 进去呢？ 要回答这个问题就要了解一下这个队列的结构 。

这个队列的结构很有趣。

```typescript
[Success , Fail , Success , Fail , ....]
```

他是`一个成功， 一个失败`，这样的顺序来记录任务。

这样就明白 为什么初始化请求任务的时候 会推一个 undefined 进去了。因为 `真正请求失败的处理不在这里`。

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5e19e2bc29d1429cb6ad1fbb2bd83b9a~tplv-k3u1fbpfcp-watermark.image?)

之后 创建了一个 resolve 的 Promise 。`每一次指针后移两位`， `这样就把 成功 和 失败的任务一起调度了`。 把对应的任务按照顺序扔到微任务队列中。 调度就结束了。

## 总结

axios 是个体量不大 , 但是设计感很足的库。很适合作为一个阅读源码入门的库。相信能看完的同学一定可以在面试时对 axios 的设计侃侃而谈，在日常开发中能得心应手！
