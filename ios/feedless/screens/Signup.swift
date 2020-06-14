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
    @State var showImagePicker : Bool = false
    @State var uiImage : UIImage? = nil

    init(ssbKeyFile: String = "") {
        _ssbKeyText = State(initialValue: ssbKeyFile)
    }

    func keyboardOffset() -> CGFloat {
        return [keyboard.currentHeight - 35, CGFloat(0)].max()! * -1
    }

    func imageOrFallback() -> some View {
        if
            let uiImage = self.uiImage,
            let resizedImage = Utils.resizeImage(image: uiImage, targetSize: CGSize(width: 256, height: 256))
        {
            return AnyView(
                Image(uiImage: resizedImage)
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(width: 48, height: 48)
                .border(Styles.darkGray)
            )
        }

        return AnyView(
            Image("no-avatar")
            .resizable()
            .aspectRatio(contentMode: .fit)
            .frame(width: 48, height: 48)
            .border(Styles.darkGray)
        )
    }

    var form: some View {
        Group {
            Form {
                Section(header: Text("Avatar")) {
                    HStack {
                        imageOrFallback()

                        Button("Choose from library..."){
                           self.showImagePicker = true
                        }
                    }
                }

                Section(header: Text("Name")) {
                    TextField("", text: $name)
                        .padding(.vertical)
                }

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
                    PrimaryButton(text: "Sign Up") {
                        self.profiles.signup(context: self.context, name: self.name, image: self.uiImage) {
                            self.ssbKeyText = Utils.ssbKeyJSON() ?? ""
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 10)
                .background(Color(Styles.uiWhite))
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
                .background(Color(Styles.uiWhite))
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
        .sheet(isPresented: self.$showImagePicker) {
            PhotoCaptureView(showImagePicker: self.$showImagePicker, uiImage: self.$uiImage)
        }
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
