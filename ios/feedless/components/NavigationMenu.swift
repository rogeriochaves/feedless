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
                        Image(systemName: "line.horizontal.3")
                            .imageScale(.large)
                            .foregroundColor(Color(self.router.navigationBarTextColor))
                    }.actionSheet(isPresented: $menuOpen) {
                        ActionSheet(
                            title: Text("Actions"),
                            buttons: [
                                .cancel { self.menuOpen = false },
                                .default(Text("Edit Profile")),
                                .default(Text("Feedback")),
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
                .background(NavigationConfigurator { nc, ni in
                    let navBarAppearance = UINavigationBarAppearance()
                    navBarAppearance.titleTextAttributes = [.foregroundColor: self.router.navigationBarTextColor]
                    navBarAppearance.largeTitleTextAttributes = [.foregroundColor: self.router.navigationBarTextColor]
                    navBarAppearance.backgroundColor = self.router.navigationBarBackgroundColor
//                    navBarAppearance.backButtonAppearance = [.foregroundColor: self.router.navigationBarTextColor]

                    nc.navigationBar.standardAppearance = navBarAppearance
                    nc.navigationBar.scrollEdgeAppearance = navBarAppearance
                    nc.navigationBar.compactAppearance = navBarAppearance
                    nc.navigationBar.barTintColor = self.router.navigationBarBackgroundColor

                    // ni.largeTitleDisplayMode = .never

//                    nc.navigationBar.backgroundColor = self.router.navigationBarBackgroundColor
//                    nc.navigationBar.barTintColor = self.router.navigationBarBackgroundColor
//                    nc.navigationBar.titleTextAttributes = [.foregroundColor : self.router.navigationBarTextColor]
                })
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
