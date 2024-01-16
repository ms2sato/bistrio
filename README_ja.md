# これは何ですか？

TypeScript & React & Zod 製のWebアプリケーションフレームワークです。三層アーキテクチャで言うプレゼンテーション層を責務にしていて、JSXで書かれるフロントエンドと、フロントエンドと疎通するためのバックエンドの層(サーバーの表層)をカバーしています。

## 課題と解法

Next.js、Vue.jsなどの多くのフレームワークはフロントエンドだけを関心事にしています。その場合、以下のような課題があると考えています。

- 多くの場合においてバックエンドとの接続について本質的ではない作業（URLを疎通するように調整するなど）が発生してしまう。
- Server Side Rendering(SSR)を利用しようとするとフロントエンド用のサーバー（BFF）が必要になり、システム構成が複雑化する。

このような課題に対応するため、本フレームワークは"フロントエンドからバックエンドの入り口まで"を責務としています。それにより以下のようになりました。

- サーバーのコードからフロントエンド用の通信コードを自動生成できるため、オブジェクトのメソッドとして呼び出すことで通信ができ、疎通作業が不要です。
- バックエンド部分も含んだフレームワークのためBFFが不要です。

バックエンド側はRESTの哲学に従って構築する考えのため、Resource を概念として定義し、そのメソッドを呼び出すまでがフレームワークの責務となっています。フルスタックではないので、Resourceの実装となるDBなどの構成は好きなものを選んでいただけます。

# 特徴

- SSRされるPageの内容がクライアント・サーバー間でなるべく差異を持たないように設計されています。
- JSXで書かれるPageでは、サーバーから公開されるResourceオブジェクトを呼び出すコードが書けます。Remote Procedure Call(RPC) のように、サーバーから公開されているオブジェクトの型に対してコードを書けます。
  - 実行時はそれぞれ以下のように動作します。
    - CSR: 自動生成された Resourceオブジェクトのスタブを介して APIをコールするコードとして呼び出されます。
    - SSR: Resourceオブジェクトを直接コールし、DBへの接続まで同一プロセスで行うコードとして呼び出されるため、実行効率の高い処理になります。
- RoutesやResourceのコードを書くと自動的に多くのコードを生成して、開発者が定型の退屈なコードを書かなくて良いように作られています。この時、TypeScriptの型情報で完結させており、OpenAPIのフォーマットのような外部フォーマットを別途書くようなことをしないで開発できます。詳しくは[自動生成](#自動生成)をご覧ください。

## Routes-driven development(RDD)

Webのシステムにおいて最も情報が多いのがルーティングであるため、まずこのルーティングから開発を始めることを推奨しています。この情報は複数の箇所で統一して利用されるため、システムの一貫性を維持します。

以下のような中心になる複数のRouting情報が一つのRoutes情報から生成されます。

- サーバーの Routing 情報
- ブラウザの SPA Routing の情報
- REPLで利用可能なResource情報
- システム内のエンドポイントの情報

## Resource-View-Routes(RVR)

本フレームワークはMVCの設計ではありません。MVCは多くの人が慣れ親しんだ大変わかりやすい概念だと思います。しかし本フレームワークではあえてControllerを廃した形を取りました。

というのは Controller は "ロジックが書きたくなるようなファイルであるにも関わらずWebの情報を扱う概念" であるためです。このコンフリクトがいわゆる Fat Controller のような問題も生んでしまいます。これに抗うため 多くの人が Controller から処理を委譲されるクラスを書きたくなるなどしていたと思います。

本システムにおける Resource は、Controllerと位置付けが大変似てはいますが、"Webに関する情報を持たないもの"です。つまり広義の Model の位置付けです。このファイルにはユースケースに従った多くのロジックを書けます。もしも共通化などが必要であれば別の概念（MVCのModelに近いものになると思います）をアプリケーションの開発者が考えれば良いでしょう。

結果、多くの場合にController が担っていた以下の機能は Routes へ移動されました。

- アクセス可能かどうかの権限チェック(Middleware)
- クライアントから送信された値のチェック(Zod)
- Mass Assignment 脆弱性への対応(Zod)

### Routes

独自のDSLを使って構造化されたRoutingを定義します。内容の基本構造は Resource への対応を定義するものです。

以下に紹介を行いますが、まだドキュメントの整備が間に合っていないところもあり、仕様の調整等も行う可能性があります。最新の利用例は [example/tasks](./example/tasks/universal/routes/) を確認いただくと良いでしょう。

#### Router.resources

Routerに定義されたresourcesメソッドはリクエスト情報をResourceへ伝えるためのエンドポイントを定義します。

この時Zodの型情報を各アクションに対して割り当て、フレームワークが行うスキーマチェックを通過したものだけが Resource で扱えるようにしています。つまり入力値のバリデーションが自動で行われ、明示した値だけがサーバーで受信され、堅牢になります。

```ts
// `/tasks` のパスに対応する1つのResourceに対応するCRUDを定義しています。
r.resources('tasks', {
  name: 'tasks', // リソースの名前(TasksResource インターフェース が自動生成されます)
  actions: crud(), // 典型的なアクションが定義されます
  construct: {
    // Zodのスキーマを指定して、受け付けるデータを明示します
    create: { schema: taskCreateWithTagsSchema },
    update: { schema: taskUpdateWithTagsSchema },
  },
})
```

`tasks` リソースを例にすると、デフォルトで以下のようなルーティングが想定されています。`crud()` 関数はこれらを一気に定義します。

| action | method    | path            | type | page | 主な用途       |
| ------ | --------- | --------------- | ---- | ---- | -------------- |
| index  | GET       | /tasks          |      | true | 一覧画面       |
| show   | GET       | /tasks/$id      |      | true | 詳細画面       |
| build  | GET       | /tasks/build    |      | true | 新規作成画面   |
| edit   | GET       | /tasks/$id/edit |      | true | 編集画面       |
| list   | GET       | /tasks.json     | json |      | 一覧のJson取得 |
| load   | GET       | /tasks/$id.json | json |      | 詳細のJson取得 |
| create | POST      | /tasks/         |      |      | 新規作成処理   |
| update | PUT,PATCh | /tasks/$id      |      |      | 更新処理       |
| delete | DELETE    | /tasks/$id      |      |      | 削除処理       |

例えば `/tasks` の edit アクションは `/tasks/$id/edit` (`$id` はプレースホルダです) となります。

`crud()` の他に `api()` 関数を用意しています。これは `list`, `load`, `create`, `update`, `delete` だけを定義するものです。

また、 `crud()` や `api()` は共通の引数で情報をフィルタすることが可能です。

```ts
crud({ only: ['index', 'load'] }) // index と load のみ定義
api({ except: ['list', 'load'] }) // list と load 以外の create, update, delete を定義

crud('index', 'load') // index と load のみ定義(onlyのシンタックス・シュガー)
```

また、 actions として指定できるのは `crud()` 等のユーティリティの戻り値だけではなく、独自に定義することができます。例えば以下のようにして独自のアクション `done` を追加できます。

```ts
r.resources({
  ...
  actions: [...crud(), { action: 'done', path: '$id/done', method: 'post', type: 'json' }],
  ...
})
```

#### Router.pages

Resourceに無関係なページを作成するためのメソッドです。

```ts
r.pages('/', ['/', '/about']) // `/`、`/about` のルーティングを定義
```

#### その他

- scope: ルーティングの階層を作るユーティリティです(内部でsubを呼びます)
- layout: ReactRouterのlayoutを定義できます
- sub: 子に当たるRouterを作成します

### Resource

RESTの概念における Resource です。Resourceは開発者が必要とするメソッドを自由に作成できます。Routesからはこれらのメソッドをアクションとして呼び出せます。

- Modelの自動テストでテストができます。
- ResourceはREPLからも簡単に呼び出せるため、ロジックの動作確認がやりやすいです。
- 広義のModelの位置付けなので、多くのロジックをそのまま書いて問題ありません。

Routes を定義した後、 `npm run bistrio:gen` が実行されれば、`.bistrio/resources` 内に対応するインターフェースが自動生成されます。この型を使って実際の Resource を実装すると動作に支障ない内容が作成できます。

作成を補助するユーティリティ関数として defineResource が用意されています。`server/resources` 内に URL のパス階層と一致するディレクトリを作成した上で `resource.ts` として作成します。

例えば `/tasks` のResourceは `server/resources/tasks/resource.ts` のファイルが該当します。内容は以下のようになります。

```ts
import { CustomMethodOption } from '@/server/customizers'
import { TasksResource } from '@bistrio/resources'

//...

export default defineResource(
  () =>
    ({
      // 各アクションの名前に対応したメソッドを作る
      list: async (params): Promise<Paginated<Task>> => {
        return {
          //...
        }
      },

      load: async ({ id }): Promise<Task> => {
        // これはprismaを利用した例
        const task = await prisma.task.findUniqueOrThrow({ id })
        return task
      },

      // ...
      done: async ({ id }) => await prisma.task.update({ where: { id }, data: { done: true } }),
    }) as const satisfies TasksResource<CustomMethodOption>, // この指定で具体的な型を外から利用可能になる
)
```

より実践的な例は [example/tasks/server/resources/tasks/resource.ts](example/tasks/server/resources/tasks/resource.ts) にあります。

Resource の作成の注意としては以下のポイントがあります

- `TaskResource` 型はカスタム引数の型を指定できるジェネリクス型です。`CustomMethodOption` のようなシステムで定義した型を指定します。
- `as const satisfies TasksResource<CustomMethodOption>` のように、 `as const satisfies` を付与して具体的な型を返すようにしてください

#### `CustomMethodOption` について

セッションからユーザーの情報を取り出すなどの処理は Resource の中では行いません。このような処理はシステムのほとんどの箇所で共通に行える処理であると考えて、アクションを呼び出す前に `server/customizers/index.ts` の `createActionOptions` で行われます。この中身はアプリケーションに合わせてカスタマイズしてください。

`ctx` 変数から `req` で `Request` オブジェクト(Express由来のオブジェクトです)が取得できるので、これを使って実装します。この戻り値がリソースの各アクションのオプション引数としてセットされるので、アクション内で利用できます。

```ts
export const createActionOptions: CreateActionOptionFunction = (ctx) => {
  debug('createOptions: req.params %s', ctx.params)

  const customMethodOption: CustomMethodOption = { user: ctx.req.user as User }

  if (ctx.params.adminId) {
    customMethodOption.admin = {
      id: Number(ctx.params.adminId),
      accessedAt: new Date(),
    }
  }

  return customMethodOption
}
```

例えば Resourceに `load` アクションを追加した場合の第二引数に設定され、利用できます。引数がない場合には CustomMethodOption だけが引数として設定されます。

```ts
      load: async ({ id }, options: CustomMethodOption): Promise<Task> => {
        // options を利用した処理を書けます
      },
```

### View

JSXで書かれたViewです。本フレームワークでは RenderSupport を介して サーバーのResourceを操作できます。React18 から導入された Suspense への対応も済んでいるので、 useEffect を多用するコードを書く必要はありません。

Viewの実体はフロントエンドのJSの慣習に従って Page と呼ばれます。

`universal/pages` 以下に URL のパス階層と一致するディレクトリを作成した上で ファイル名が一致するように作成してください。

例えば以下のようになります。

- `/about`: `universal/pages/about.tsx`
- `/` : `universal/pages/index.tsx`(indexは`/`を示す特殊な名前です)
- `/test/mypage`: `universal/pages/test/mypage.tsx`

### RenderSupport

Page 実装する際には サーバーからのデータを使うことが必要です。本フレームワークでは この時に `RenderSupport` を介して情報を取得します。

例えば tasks リソースの持つ load アクションを呼び出したければ以下のように書けます。

```ts
import { useRenderSupport } from '@bistrio/routes/main'

// ...

function Task({ id }: { id: number }) {
  const rs = useRenderSupport()
  const task = rs.suspendedResources().tasks.load({ id })
  // rs.suspendedResources() によって Suspense 対応されたオブジェクトが取得できます。

  return <>{/* ... */}</>
}
```

- useRenderSupport は 自動生成された '@bistrio/routes/main' に配置されたものを利用します(フレームワークから提供されるのは型が確定していません)。
- Suspense を使わない場合には `rs.resources()` として呼び出すと Promise を返す実装が利用できます。

# 自動生成

## SPA Routingの設定とサーバーのRouting

共通のRoutesから自動生成されるため、クライアントとサーバーの複数のルーティングを一致させることを考える必要はありません。

## クライアントで利用するスタブ

RoutesとResourceの情報から自動的に作成されるため、サーバー側のコード一致するスタブ生成について意識する必要はありません。

## エンドポイントの情報

ハイパーリンク等で利用されるエンドポイントの情報が Routesから自動生成されるため、型に従って利用すればリンク切れを起こすことがありません。

# ディレクトリ構造

開発の際のディレクトリ構造は以下です。詳しくはExample実装として用意している[example/tasks](example/tasks)を確認してください。

- .bistrio: 自動生成のコードはこの下に作成されます
- bin: コマンド
- config: 設定群（普段あまり操作しないものが入っています）
- public: Webに公開されるstaticなファイル
- server: サーバーサイドのコード
  - config: 設定
  - resources: Resource を配置するディレクトリ
  - middleware.ts: サーバーで呼び出される Middlewareの実装
- universal: サーバー・クライアントでの共通のコード（注意! ブラウザへ公開されます）
  - config: 設定
  - pages: JSXを配置するディレクトリ
  - routes: Routes を配置するディレクトリ
  - middleware.ts: routesで利用されるMiddlewareのインターフェース
