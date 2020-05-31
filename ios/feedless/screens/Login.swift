//
//  ContentView.swift
//  feedless
//
//  Created by Rogerio Chaves on 28/04/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import SwiftUI

struct Login: View {
    @EnvironmentObject var context : Context
    @State var loginKey = "";
    @State var errorMessage = "";
    @ObservedObject private var keyboard = KeyboardResponder()

    func keyboardOffset() -> CGFloat {
        return [keyboard.currentHeight - 200, CGFloat(0)].max()! * -1
    }

    func login(key: String) {
        let decoder = JSONDecoder()
        let cleanKey = key.replacingOccurrences(of: "^#.*$", with: "", options: [.regularExpression])

        guard
            let jsonString = cleanKey.data(using: .utf8),
            let ssbKey = try? decoder.decode(SSBKey.self, from: jsonString)
        else {
            errorMessage = "Invalid key!"
            return
        }

        do {
            FileManager.default.createFile(
                atPath: Utils.ssbFolder() + "/secret",
                contents: key.data(using: .utf8),
                attributes: [.posixPermissions: 0x100]
            )
            if (FileManager.default.fileExists(atPath: Utils.ssbFolder() + "/logged-out")) {
                try FileManager.default.removeItem(atPath: Utils.ssbFolder() + "/logged-out")
            }
            self.context.setSSBKey(ssbKey)
        } catch {
            errorMessage = "Error saving secrets file"
        }
    }

    var body: some View {
        VStack {
            if (!errorMessage.isEmpty) {
                Text(errorMessage)
            }
            SecureField("Enter your key", text: $loginKey)
                .padding()
            Button(action: { self.login(key: self.loginKey) }) {
                HStack {
                    Text("Login")
                }
                    .frame(minWidth: 0, maxWidth: .infinity)
                    .padding()
                    .cornerRadius(40)
                    .background(Styles.primaryBlue)
                    .foregroundColor(Color(Styles.uiDarkBlue))
            }
        }
        .offset(y: keyboardOffset())
        .animation(.easeOut(duration: 0.16))
        .navigationBarTitle("Login")
    }
}

struct Login_Previews: PreviewProvider {
    static var previews: some View {
        Login()
            .environmentObject(Samples.context())
    }
}

