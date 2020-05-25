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
    @EnvironmentObject var router : Router
    @State private var selection = 0

    func menuButton(route: (String, AnyView), emoji: String, text: String) -> some View {
        let isSelected = router.currentRoute.0 == route.0
        return Button(action: {
            self.router.changeRoute(to: route)
        }) {
            VStack {
                Image(uiImage: emoji.image()!)
                    .renderingMode(isSelected ? .original : .template)
                Text(text)
                    .font(.system(size: 13))
                    .fixedSize(horizontal: true, vertical: false)
            }
            .frame(maxWidth: .infinity)
            .background(Color.white)
            .foregroundColor(isSelected ? Styles.darkGray : Styles.gray)
        }
    }

    var body: some View {
        Group {
            NavigationMenu {
                router.currentRoute.1
            }

            Divider()
             .padding(.bottom, 10)
            HStack(spacing: 0) {
                menuButton(route: router.profileScreen, emoji: "🙂", text: "Profile")
                menuButton(route: router.secretsScreen, emoji: "🤫", text: "Secrets")
                menuButton(route: router.friendsScreen, emoji: "👨‍👧‍👦", text: "Friends")
                menuButton(route: router.communitiesList, emoji: "🌆", text: "Communities")
                menuButton(route: router.searchScreen, emoji: "🔎", text: "Search")
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
