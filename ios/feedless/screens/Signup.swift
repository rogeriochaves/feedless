//
//  ContentView.swift
//  feedless
//
//  Created by Rogerio Chaves on 28/04/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import SwiftUI

struct Signup: View {
    @EnvironmentObject var context : Context
    @EnvironmentObject var profiles : Profiles
    @EnvironmentObject var keyboard : KeyboardResponder
    @State var name = "";
    @State var errorMessage = "";
    @State var ssbKeyText = "";
    @State var isKeyFileFieldFocused = false

    init(ssbKeyFile: String = "") {
        _ssbKeyText = State(initialValue: ssbKeyFile)
    }

    func keyboardOffset() -> CGFloat {
        return [keyboard.currentHeight - 35, CGFloat(0)].max()! * -1
    }

    var form: some View {
        Group {
            Form {
                TextField("Name", text: $name)
                    .padding(.vertical)

                if (!errorMessage.isEmpty) {
                    Text(errorMessage)
                }
            }
            VStack(spacing: 0) {
                Divider()
                    .padding(0)
                HStack {
                    Spacer()
                    PrimaryButton(text: "Sign Up") {
                        self.profiles.signup(context: self.context, name: self.name) {
                            self.ssbKeyText = Utils.ssbKeyJSON() ?? ""
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 10)
                .background(Color.white)
            }
            .offset(y: keyboardOffset())
            .animation(.easeOut(duration: 0.16))
        }
    }

    var copyKey : some View {
        Group {
            VStack(alignment: .leading) {
                Text("Now copy your key, and save it somewhere safe, it is your ONLY way back in:")
                    .padding(.vertical, 10)
                MultilineTextField(
                    "Copy your key",
                    text: $ssbKeyText,
                    isResponder: $isKeyFileFieldFocused
                )
                .padding(5)
                .background(Styles.lightGray)
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(Styles.gray, lineWidth: 1)
                )
                Text("NEVER share it with anyone")
                .bold()
                .padding(.vertical, 10)
            }.padding()
            Spacer()
            VStack(spacing: 0) {
                Divider()
                    .padding(0)
                HStack {
                    Spacer()
                    PrimaryButton(text: "Continue") {
                        if let ssbKey = Utils.ssbKey() {
                            self.profiles.load(context: self.context, id: ssbKey.id)
                            self.context.ssbKey = ssbKey
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 10)
                .background(Color.white)
            }
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            if ssbKeyText != "" {
                copyKey
            } else {
                form
            }
        }
        .edgesIgnoringSafeArea(.horizontal)
        .navigationBarTitle("Create account")
    }
}

struct Signup_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            NavigationMenu {
                Signup()
            }
                .environmentObject(Samples.context())
                .environmentObject(Router())
                .environmentObject(KeyboardResponder())
                .environmentObject(Profiles())

            NavigationMenu {
                Signup(ssbKeyFile: """
{"curve": "ed25519","public": "foo.ed25519","private":"bar.ed25519","id": "@VUgba/foo.ed25519}
""")
            }
                .environmentObject(Samples.context())
                .environmentObject(Router())
                .environmentObject(KeyboardResponder())
                .environmentObject(Profiles())

        }
    }
}
