import JavaScriptCore

class JSService {

    let context = JSContext()

    let shared = JSService()

    let require: @convention(block) (String) -> (JSValue?) = { path in
        let expandedPath = NSString(string: path).expandingTildeInPath

        // Return void or throw an error here.
        guard FileManager.default.fileExists(atPath: expandedPath)
            else { debugPrint("Require: filename \(expandedPath) does not exist")
                   return nil }

        guard let fileContent = try? String(contentsOfFile: expandedPath)
            else { return nil }

        return JSService.shared.context.evaluateScript(fileContent)
    }

    init() {
        self.context.exceptionHandler = { context, exception in
            print(exception!.toString())
        }
        self.context.setObject(self.require,
                               forKeyedSubscript: "require" as NSString)
    }

    func repl(_ string: String) -> String {
        return self.context.evaluateScript(string).toString()
    }
}
