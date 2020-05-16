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

    let profileScreen: some View = ProfileScreen()
    let friendsScreen: some View = Text("Second View").navigationBarTitle(Text("Friends"))
    let debugScreen: some View = Debug().navigationBarTitle(Text("Debug"))

    var body: some View {
        VStack {
            if (selection == 0) {
                NavigationMenu {
                    profileScreen
                }
            } else if (selection == 1) {
                NavigationMenu {
                    friendsScreen
                }
            } else if (selection == 2) {
                NavigationMenu {
                    debugScreen
                }
            }

            Rectangle()
                .frame(height: 1.0, alignment: .top)
                .background(Color.clear)
                .foregroundColor(Styles.gray)
            HStack {
                menuButton(index: 0, emoji: "🙂", text: "Profile")
                menuButton(index: 1, emoji: "👨‍👧‍👦", text: "Friends")
                menuButton(index: 2, emoji: "🛠", text: "Debug")
            }
        }
    }
}

struct MainScreen_Previews: PreviewProvider {
    static var previews: some View {
        MainScreen()
            .environmentObject(Samples.context())
            .environmentObject(Samples.profiles())
    }
}
