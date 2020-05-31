//
//  EditProfileScreen.swift
//  feedless
//
//  Created by Rogerio Chaves on 01/06/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import SwiftUI

struct EditProfileScreen: View {
    @EnvironmentObject var context : Context
    @EnvironmentObject var profiles : Profiles
    @EnvironmentObject var keyboard : KeyboardResponder
    @State var name = "";

    func keyboardOffset() -> CGFloat {
        return [keyboard.currentHeight - 85, CGFloat(0)].max()! * -1
    }

    var body: some View {
        UITableView.appearance().backgroundColor = UIColor.secondarySystemBackground
        
        return VStack(spacing: 0) {
            Form {
                Section(header: Text("Name")) {
                    TextField("Name", text: $name)
                        .padding(.vertical)
                }
            }
            VStack(spacing: 0) {
                Divider()
                    .padding(0)
                HStack {
                    Spacer()
                    PrimaryButton(text: "Save") {
//                        self.profiles.update(context: self.context, name: self.name)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 10)
                .background(Color.white)
            }
            .offset(y: keyboardOffset())
            .animation(.easeOut(duration: 0.16))
        }
        .edgesIgnoringSafeArea(.horizontal)
        .navigationBarTitle("Edit Profile")
        .onAppear {
            if let id = self.context.ssbKey?.id, case .success(let profile) = self.profiles.profiles[id] {
                self.name = profile.profile.name ?? ""
            }
        }
    }
}

struct EditProfileScreen_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            NavigationMenu {
                EditProfileScreen()
            }
                .environmentObject(Samples.context())
                .environmentObject(Router())
                .environmentObject(KeyboardResponder())
                .environmentObject(Profiles())
        }
    }
}
