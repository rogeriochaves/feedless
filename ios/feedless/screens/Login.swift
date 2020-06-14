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
    @EnvironmentObject var keyboard : KeyboardResponder
    @State var loginKey = "";
    @State var errorMessage = "";

    func keyboardOffset() -> CGFloat {
        return [keyboard.currentHeight - 35, CGFloat(0)].max()! * -1
    }

    func login(key: String) {
        let decoder = JSONDecoder()
        let cleanKey = Utils.clearKeyString(key)

        guard
            let jsonString = cleanKey.data(using: .utf8),
            let ssbKey = try? decoder.decode(SSBKey.self, from: jsonString)
        else {
            errorMessage = "Invalid key"
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
        VStack(spacing: 0) {
            Form {
                SecureField("Enter your key", text: $loginKey)
                    .padding(.vertical)

                VStack(alignment: .leading) {
                    HStack(spacing: 0) {
                        Text("By using Feedless, you agree to our ")
                            .foregroundColor(.gray)
                            .lineLimit(1)

                        Text("Terms")
                            .foregroundColor(.blue)
                            .underline()
                            .onTapGesture {
                                if let url = URL(string: "https://feedless.social/rules") {
                                    UIApplication.shared.open(url)
                                }
                            }
                    }
                    HStack(spacing: 0) {
                        Text("and ")
                            .foregroundColor(.gray)

                        Text("Privacy Policy")
                        .foregroundColor(.blue)
                        .underline()
                        .onTapGesture {
                            if let url = URL(string: "https://feedless.social/privacy-policy") {
                                UIApplication.shared.open(url)
                            }
                        }
                    }
                }

                if (!errorMessage.isEmpty) {
                    Text(errorMessage)
                }
            }
            VStack(spacing: 0) {
                Divider()
                    .padding(0)
                HStack {
                    Spacer()
                    PrimaryButton(text: "Login") {
                        self.login(key: self.loginKey)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 10)
                .background(Color(Styles.uiWhite))
            }
            .offset(y: keyboardOffset())
            .animation(.easeOut(duration: 0.16))
        }
        .edgesIgnoringSafeArea(.horizontal)
        .navigationBarTitle("Login")
    }
}

struct Login_Previews: PreviewProvider {
    static var previews: some View {
        NavigationMenu {
            Login()
        }
            .environmentObject(Samples.context())
            .environmentObject(Router())
            .environmentObject(KeyboardResponder())
    }
}

