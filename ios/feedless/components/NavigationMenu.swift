//
//  NavigationMenu.swift
//  feedless
//
//  Created by Rogerio Chaves on 14/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import SwiftUI

struct NavigationMenu<C: View> : View {
    private let childView: C

    @EnvironmentObject var context : Context
    @EnvironmentObject var router : Router
    @State private var menuOpen = false

    init(_ childView: () -> (C)) {
        self.childView = childView()
    }

    var body: some View {
        NavigationView {
            childView
                .navigationBarItems(trailing: (
                    Button(action: {
                        self.menuOpen = true
                    }) {
                        HStack {
                            Spacer()
                            Image(systemName: "line.horizontal.3")
                                .imageScale(.large)
                                .foregroundColor(Color(self.router.navigationBarTextColor))
                                .padding(.trailing, 5)
                        }
                            // This is for increasing button click area
                            .frame(width: 48, height: 48)
                            .contentShape(
                                Rectangle()
                            )
                    }
                    .actionSheet(isPresented: $menuOpen) {
                        ActionSheet(
                            title: Text("Actions"),
                            buttons: [
                                .cancel { self.menuOpen = false },
                                .default(Text("Edit Profile")) {
                                    self.router.changeRoute(to: self.router.editProfileScreen)
                                    self.menuOpen = false
                                },
                                .default(Text("Feedback")) {
                                    if let url = URL(string: "https://github.com/rogeriochaves/feedless/issues") {
                                        UIApplication.shared.open(url)
                                    }
                                },
                                .default(Text("Pubs")) {
                                    self.router.changeRoute(to: self.router.pubsScreen)
                                    self.menuOpen = false
                                },
                                .default(Text("Debug")) {
                                    self.router.changeRoute(to: self.router.debugScreen)
                                    self.menuOpen = false
                                },
                                .destructive(Text("Logout")) {
                                    self.context.logout()
                                }
                            ]
                        )
                    }
                ))
        }
        .navigationViewStyle(StackNavigationViewStyle())
    }
}

struct NavigationMenu_Previews: PreviewProvider {
    static var previews: some View {
        NavigationMenu() {
            Text("lorem ipsum")
            .navigationBarTitle(Text("Foo bar"))
        }
    }
}
