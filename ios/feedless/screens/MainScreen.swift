//
//  ContentView.swift
//  feedless
//
//  Created by Rogerio Chaves on 28/04/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import SwiftUI

struct MainScreen: View {
    @EnvironmentObject var context : Context
    @State private var selection = 0

    func menuButton(index: Int, emoji: String, text: String) -> some View {
        return Button(action: { self.selection = index }) {
            VStack {
                Image(uiImage: emoji.image()!)
                    .renderingMode(selection == index ? .original : .template)
                Text(text)
            }
            .frame(maxWidth: .infinity)
            .background(Color.white)
            .foregroundColor(selection == index ? Styles.darkGray : Styles.gray)
        }
    }

    let profileScreen: some View = ProfileScreen(id: nil)
    let friendsScreen: some View = FriendsScreen()
    let secretsScreen: some View = SecretsScreen()
    let communitiesList: some View = CommunitiesList()
    let debugScreen: some View = Debug().navigationBarTitle(Text("Debug"))

    var body: some View {
        VStack(spacing: 0) {
            if (selection == 0) {
                NavigationMenu {
                    profileScreen
                }
            } else if (selection == 1) {
                NavigationMenu {
                    secretsScreen
                }
            } else if (selection == 2) {
                NavigationMenu {
                    friendsScreen
                }
            } else if (selection == 3) {
                NavigationMenu {
                    communitiesList
                }
            } else if (selection == 4) {
                NavigationMenu {
                    debugScreen
                }
            }

            Divider()
             .padding(.bottom, 10)
            HStack {
                menuButton(index: 0, emoji: "🙂", text: "Profile")
                menuButton(index: 1, emoji: "🤫", text: "Secrets")
                menuButton(index: 2, emoji: "👨‍👧‍👦", text: "Friends")
                menuButton(index: 3, emoji: "🌆", text: "Communities")
                menuButton(index: 4, emoji: "🛠", text: "Debug")
            }
        }
    }
}

struct MainScreen_Previews: PreviewProvider {
    static var previews: some View {
        MainScreen()
            .environmentObject(Samples.context())
            .environmentObject(Samples.profiles())
            .environmentObject(ImageLoader())
    }
}
