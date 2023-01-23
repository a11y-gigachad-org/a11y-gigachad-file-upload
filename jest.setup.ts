import "@testing-library/jest-dom"
/**  polyfill `window.fetch` in node */
import "whatwg-fetch"
import { setupServer } from "msw/node"

export const server = setupServer()
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
