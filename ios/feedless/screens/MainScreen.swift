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
            .foregroundColor(selection == index ? Color(red: 0.4, green: 0.4, blue: 0.4) : Color(red: 0.8, green: 0.8, blue: 0.8))
        }
    }

    var body: some View {
        VStack {
            if (selection == 0) {
                NavigationMenu {
                    ProfileScreen()
                    .navigationBarTitle(Text("Profile"))
                }
            } else if (selection == 1) {
                NavigationMenu {
                    Text("Second View")
                    .navigationBarTitle(Text("Friends"))
                }
            } else if (selection == 2) {
                NavigationMenu {
                    Debug()
                    .navigationBarTitle(Text("Debug"))
                }
            }

            Rectangle()
                .frame(height: 1.0, alignment: .bottom)
                .background(Color.clear)
                .foregroundColor(Color(red: 0.6, green: 0.6, blue: 0.6))
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
    }
}
