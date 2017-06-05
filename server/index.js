import Koa from 'koa';
import Router from 'koa-router';

const router = new Router({
  prefix: '',
});

const app = new Koa();
app.use(router.routes());
app.use(router.allowedMethods());

router.get('/', async (ctx, next) => {
  await next();
  ctx.body = 'hello koa.';
});

export default app;
