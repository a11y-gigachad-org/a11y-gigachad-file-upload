import { screen, render } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { rest } from "msw"
import { setupServer } from "msw/node"
import { FileUploadSingle } from "./"

const server = setupServer()

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

test("shoudld have `file` input and `upload` button", () => {
  render(<FileUploadSingle url="/fake" />)

  expect(screen.getByLabelText("choose a file to upload")).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "upload a file" })).toBeInTheDocument()
  expect(screen.getByLabelText("choose a file to upload")).toHaveAccessibleDescription(
    "no file currently selected"
  )
})

test("shoudld select a file successfully", async () => {
  const user = userEvent.setup()
  const file = new File(["dummy"], "dummy.png", { type: "image/png" })

  render(<FileUploadSingle url="/fake" />)

  await user.upload(screen.getByLabelText("choose a file to upload"), file)

  const input: HTMLInputElement = screen.getByLabelText("choose a file to upload")

  expect(input?.files?.[0]).toStrictEqual(file)
  expect(input.files?.item(0)).toStrictEqual(file)
  expect(input.files).toHaveLength(1)
  expect(input).toHaveAccessibleDescription(`currently selected file is: ${file.name}`)
  expect(screen.getByText(/name of the file: dummy.png/)).toBeInTheDocument()
  expect(screen.getByText(/size in bytes: 5/)).toBeInTheDocument()
  expect(screen.getByText(/file type: image\/png/)).toBeInTheDocument()
})

test("shoudld upload a file successfully", async () => {
  const onSuccess = jest.fn()
  const user = userEvent.setup()
  const file = new File(["dummy"], "dummy.png", { type: "image/png" })

  server.use(
    rest.post("/fake", (req, res, ctx) => {
      if (req.headers.get("content-type") === "image/png") {
        return res(ctx.json({ fileId: "id" }))
      }

      return res(ctx.status(400))
    })
  )

  render(<FileUploadSingle url="/fake" onSuccess={onSuccess} />)

  await user.upload(screen.getByLabelText("choose a file to upload"), file)
  await user.click(screen.getByRole("button", { name: "upload a file" }))

  expect(await screen.findByText("successfully uploaded")).toBeInTheDocument()
  expect(onSuccess).toHaveBeenCalledTimes(1)
  expect(onSuccess).toHaveBeenCalledWith({ fileId: "id" })
})

test("shoudld reject the upload", async () => {
  const onError = jest.fn()
  const user = userEvent.setup()
  const file = new File(["dummy"], "dummy.png", { type: "image/png" })

  server.use(
    rest.post("/fake", (req, res, ctx) => {
      return res(ctx.status(400))
    })
  )

  render(<FileUploadSingle url="/fake" onError={onError} />)

  await user.upload(screen.getByLabelText("choose a file to upload"), file)
  await user.click(screen.getByRole("button", { name: "upload a file" }))

  expect(await screen.findByText("upload failed")).toBeInTheDocument()
  expect(screen.getByLabelText("choose a file to upload")).toHaveErrorMessage("upload failed")
  expect(screen.getByLabelText("choose a file to upload")).toBeInvalid()
  expect(onError).toHaveBeenCalledTimes(1)
  expect(onError).toHaveBeenCalledWith(Error("upload failed"))
})
